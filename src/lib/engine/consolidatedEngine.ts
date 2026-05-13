import {
  Row,
  generateId,
  getPaymentCurrencyAmount,
  agencies,
  users,
} from './common';
import { parseAnyFile, generateXlsxBlob, generateCsvBlob } from './fileLoaders';
import { groupBy, sumBy } from './pivotUtils';
import {
  COLUMN_NAMES,
  POINTS,
  PAYMENT_TYPES,
  refArchiveName,
  invArchiveName,
  updateReferenceWithFact,
  trimToColumns,
  loadReferenceFromFiles,
} from './paymentEngine';

// ── Types ──────────────────────────────────────────────────────────────

export interface ConsolidatedRunParams {
  refFiles: File[];
  invoiceFile: File;
  factDate: string;
  periodStart: string;
  periodEnd: string;
  salesInvoiceFile?: File;
}

export interface ConsolidatedRunResult {
  consolidatedBlob: Blob;
  consolidatedName: string;
  updatedRefBlob: Blob;
  updatedRefName: string;
}

// ── Main pipeline ──────────────────────────────────────────────────────

export async function runConsolidated(
  params: ConsolidatedRunParams
): Promise<ConsolidatedRunResult> {
  // 1. Load data (same as payment)
  const refRows = await loadReferenceFromFiles(params.refFiles, 'Csv');
  const factRows = await parseAnyFile(params.invoiceFile);
  let salesRows: Row[] = [];
  if (params.salesInvoiceFile) {
    salesRows = await parseAnyFile(params.salesInvoiceFile);
  }

  // 2. Trim to column names
  const refRowsTrimmed = trimToColumns(refRows, COLUMN_NAMES);
  let factRowsTrimmed = trimToColumns(factRows, COLUMN_NAMES);

  // 3. Parse datetime columns
  refRowsTrimmed.forEach((r) => {
    if (r['Created']) r['Created'] = new Date(r['Created']);
    if (r['Booking Created']) r['Booking Created'] = new Date(r['Booking Created']);
  });
  factRowsTrimmed.forEach((r) => {
    if (r['Created']) r['Created'] = new Date(r['Created']);
    if (r['Booking Created']) r['Booking Created'] = new Date(r['Booking Created']);
  });

  // 4. Filter to invoice period
  const periodStart = new Date(params.periodStart);
  const periodEnd = new Date(params.periodEnd);
  periodEnd.setDate(periodEnd.getDate() + 1);

  const toBeInvoiced = factRowsTrimmed.filter((r) => {
    const created = r['Created'];
    return created >= periodStart && created < periodEnd;
  });

  // 5. Same AGI modification logic as payment
  const oldAgiMap = new Map<string, Row>();
  refRowsTrimmed.forEach((r) => {
    if (r['MoP Code'] === 'AGI') {
      oldAgiMap.set(r['Booking Code'], r);
    }
  });

  const modifiedBookings = new Set<string>();
  const toBeInvoicedUpdated = toBeInvoiced.map((row) => {
    if (row['MoP Code'] === 'AGI' && oldAgiMap.has(row['Booking Code'])) {
      const oldRow = oldAgiMap.get(row['Booking Code'])!;
      const oldAmount = parseFloat(oldRow['Booking Currency Amount']) || 0;
      const newAmount = parseFloat(row['Booking Currency Amount']) || 0;
      const delta = newAmount - oldAmount;

      if (delta !== 0) {
        modifiedBookings.add(row['Booking Code']);
        const [paymentAmount, paymentCurr] = getPaymentCurrencyAmount(
          row['User'],
          row['Booking Currency'],
          delta
        );
        return {
          ...row,
          'Booking Currency Amount': delta,
          'Payment Currency Amount': paymentAmount,
          'Payment Currency': paymentCurr,
        };
      }
    }
    return row;
  });

  // 6. Add GSA columns
  const withGsaCols = toBeInvoicedUpdated.map((row) => {
    const userGsa = users[row['User']]?.gsa || '';
    const agencyGsa = agencies[row['Agent Code']]?.gsa || '';
    return {
      ...row,
      'User GSA Affectation': userGsa,
      'Agency GSA Affectation': agencyGsa,
    };
  });

  // 7. Clean notes
  const noteCleanupRegex =
    /Automatic (payrow|Revoke|PayEx payment|Denied PayEx payment|web payment)/g;
  const cleanedNotes = withGsaCols.map((row) => {
    const r = row as any;
    return {
      ...row,
      Notes: String(r['Notes'] || '').replace(noteCleanupRegex, ''),
    };
  });

  // 8. Build consolidated invoice (no PaymentGrouped in consolidated mode)
  const invoiceData = buildConsolidatedInvoice(cleanedNotes);

  // 9. Add flag columns
  const withFlags = invoiceData.map((row) => ({
    ...row,
    'Est en modification': row['_booking_created'] < periodStart ? true : false,
    'Est en modification AGI': modifiedBookings.has(row['Code reservation'])
      ? true
      : false,
    'A un remboursement': Object.keys(row).some(
      (k) => k.endsWith(' -') && parseFloat(row[k]) !== 0
    ),
  }));

  // 10. Remove marker
  const withoutMarker = withFlags.map((row) => {
    const r = row as any;
    const { '_booking_created': _, ...rest } = r;
    return rest;
  });

  // 11. Drop zero columns
  const skipCols = [
    'Code reservation',
    'A des notes',
    'Date creation',
    'Code agent',
    'Nom agent',
    'GSA agent',
    'Devise',
    'Statut reservation',
    'Commission agent',
    'Commission calculer agent',
    'Solde restant du',
    'Est en modification',
    'Est en modification AGI',
    'A un remboursement',
  ];
  const dropZeroCols = new Set<string>();
  if (withoutMarker.length > 0) {
    const keys = Object.keys(withoutMarker[0]);
    for (const key of keys) {
      if (skipCols.includes(key)) continue;
      const sum = sumBy(withoutMarker, key);
      if (sum === 0) dropZeroCols.add(key);
    }
  }

  const consolidatedRows = withoutMarker.map((row) => {
    const newRow: Row = {};
    for (const [k, v] of Object.entries(row)) {
      if (!dropZeroCols.has(k)) {
        newRow[k] = v;
      }
    }
    return newRow;
  });

  // 12. Enrich with sales consolidated (3 columns)
  let enrichedRows = consolidatedRows;
  if (params.salesInvoiceFile) {
    enrichedRows = enrichWithSalesConsolidated(consolidatedRows, salesRows);
  }

  // 13. Reorder columns: move financial columns right after Devise
  const finalRows = reorderConsolidatedColumns(enrichedRows);

  const consolidatedName = `${generateId()} ${refArchiveName(params.factDate, cleanedNotes)} ${invArchiveName(params.factDate, cleanedNotes, '.csv')} ConsolidatedInvoice.xlsx`;
  const consolidatedBlob = generateXlsxBlob([
    { name: 'ConsolidatedInvoice', rows: finalRows },
  ]);

  // 14. Updated reference
  const updatedRef = updateReferenceWithFact(refRowsTrimmed, factRowsTrimmed);
  const updatedRefName = `${refArchiveName(params.factDate, updatedRef)}.csv`;
  const updatedRefBlob = generateCsvBlob(updatedRef, ';');

  return {
    consolidatedBlob,
    consolidatedName,
    updatedRefBlob,
    updatedRefName,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function buildConsolidatedInvoice(rows: Row[]): Row[] {
  const grouped = groupBy(rows, 'Booking Code' as any);
  const invoices: Row[] = [];

  for (const [bookingCode, bookingRows] of grouped) {
    const firstRow = bookingRows[0];
    const invoice: Row = {
      'Code reservation': bookingCode,
      'A des notes': firstRow['Notes'] ? true : false,
      'Date creation': firstRow['Created'],
      'Code agent': firstRow['Agent Code'],
      'Nom agent': firstRow['Agent name'],
      'GSA agent': firstRow['Agency GSA Affectation'],
      'Devise': firstRow['Booking Currency'],
      'Statut reservation': firstRow['Booking Status'],
      'Commission agent': 0,
      'Commission calculer agent': 0,
      'Solde restant du': 0,
      '_booking_created': firstRow['Booking Created'],
    };

    // Build invoice columns same as payment
    for (const paymentType of PAYMENT_TYPES) {
      for (const point of POINTS) {
        const suffix = paymentType === 'REFUND' ? ' -' : '';
        const colName =
          point === 'Web' ? `${point}${suffix}` : `${point} DZD${suffix}`;

        const filtered = bookingRows.filter(
          (r) =>
            r['Payment Type'] === paymentType &&
            r['User GSA Affectation'] === point
        );

        if (point === 'Web') {
          invoice[colName] = sumBy(filtered, 'Payment Currency Amount');
        } else {
          const dzdSum = sumBy(
            filtered.filter((r) => r['Payment Currency'] === 'DZD'),
            'Payment Currency Amount'
          );
          invoice[colName] = dzdSum;

          const eurColName = colName.replace(' DZD', ' EUR');
          const eurSum = sumBy(
            filtered.filter((r) => r['Payment Currency'] === 'EUR'),
            'Payment Currency Amount'
          );
          invoice[eurColName] = eurSum;
        }
      }
    }

    invoices.push(invoice);
  }

  return invoices;
}

function enrichWithSalesConsolidated(invoiceRows: Row[], salesRows: Row[]): Row[] {
  const salesGrouped = groupBy(salesRows, 'Code reservation' as any);
  const salesMap = new Map<string, Row>();

  for (const [code, group] of salesGrouped) {
    if (group.length > 0) {
      salesMap.set(code, group[group.length - 1]);
    }
  }

  // Update existing rows
  const updated: Row[] = [];

  for (const row of invoiceRows) {
    const code = row['Code reservation'];
    const salesRow = salesMap.get(code);
    const updatedRow: Row = {
      ...row,
      'Commission agent': salesRow
        ? parseFloat((salesRow['Commission agent'] || 0) as any) || 0
        : 0,
      'Commission calculer agent': salesRow
        ? parseFloat((salesRow['Commission calculer agent'] || 0) as any) || 0
        : 0,
      'Solde restant du': salesRow
        ? parseFloat((salesRow['Solde restant du'] || 0) as any) || 0
        : 0,
    };
    updated.push(updatedRow);
  }

  // Append new codes
  for (const [code, salesRow] of salesMap) {
    if (!invoiceRows.some((r) => r['Code reservation'] === code)) {
      const newRow: Row = {
        'Code reservation': code,
        'A des notes': false,
        'Date creation': salesRow['Date creation'],
        'Code agent': salesRow['Code agent'],
        'Nom agent': salesRow['Nom agent'],
        'GSA agent': salesRow['GSA agent'],
        'Devise': salesRow['Devise'],
        'Statut reservation': salesRow['Statut reservation'],
        'Commission agent': parseFloat((salesRow['Commission agent'] || 0) as any) || 0,
        'Commission calculer agent':
          parseFloat((salesRow['Commission calculer agent'] || 0) as any) || 0,
        'Solde restant du': parseFloat((salesRow['Solde restant du'] || 0) as any) || 0,
      };
      updated.push(newRow);
    }
  }

  return updated;
}

function reorderConsolidatedColumns(rows: Row[]): Row[] {
  if (rows.length === 0) return rows;

  const allKeys = Object.keys(rows[0]);
  const finCols = [
    'Commission agent',
    'Commission calculer agent',
    'Solde restant du',
  ].filter((k) => allKeys.includes(k));

  if (finCols.length === 0 || !allKeys.includes('Devise')) return rows;

  const devisePos = allKeys.indexOf('Devise');
  const otherCols = allKeys.filter((k) => !finCols.includes(k));
  const finalOrder = [
    ...otherCols.slice(0, devisePos + 1),
    ...finCols,
    ...otherCols.slice(devisePos + 1),
  ];

  return rows.map((row) => {
    const newRow: Row = {};
    for (const key of finalOrder) {
      newRow[key] = row[key];
    }
    return newRow;
  });
}
