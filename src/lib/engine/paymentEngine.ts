import { Row, generateId, dateRangeStr, getPaymentCurrencyAmount, agencies, users } from './common';
import { parseAnyFile, generateXlsxBlob, generateCsvBlob } from './fileLoaders';
import { groupBy, sumBy } from './pivotUtils';

// ── Constants ──────────────────────────────────────────────────────────

export const COLUMN_NAMES = [
  'MoP Code',
  'Trans. Num.',
  'Payment Currency Amount',
  'Payment Currency',
  'Booking Currency Amount',
  'Booking Currency',
  'Exchange Rate',
  'Created',
  'Terminal',
  'User',
  'Agent Code',
  'Agent name',
  'Booking Code',
  'Booking Created',
  'Booking Status',
  'Is Preliminary',
  'Payment Type',
  'Notes',
];

export const POINTS = ['Web', 'Zaatcha', 'Siege', 'Port Alger', 'Port Oran', 'OPS', 'NVM'];
export const CURRENCIES = ['DZD', 'EUR'];
export const PAYMENT_TYPES = ['SALE', 'REFUND'];

export const INVOICE_COLUMNS = [
  'Code reservation',
  'A des notes',
  'Date creation',
  'Code agent',
  'Nom agent',
  'GSA agent',
  'Devise',
  'Statut reservation',
  'WEB',
  'Zaatcha DZD',
  'Zaatcha EUR',
  'Siege DZD',
  'Siege EUR',
  'Port Alger DZD',
  'Port Alger EUR',
  'Port Oran DZD',
  'Port Oran EUR',
  'OPS DZD',
  'OPS EUR',
  'NVM DZD',
  'NVM EUR',
  'WEB -',
  'Zaatcha DZD -',
  'Zaatcha EUR -',
  'Siege DZD -',
  'Siege EUR -',
  'Port Alger DZD -',
  'Port Alger EUR -',
  'Port Oran DZD -',
  'Port Oran EUR -',
  'OPS DZD -',
  'OPS EUR -',
  'NVM DZD -',
  'NVM EUR -',
];

// ── Types ──────────────────────────────────────────────────────────────

export interface PaymentRunParams {
  refFiles: File[];
  invoiceFile: File;
  factDate: string; // YYYY-MM-DD
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  salesInvoiceFile?: File;
}

export interface PaymentRunResult {
  paymentGroupedBlob: Blob;
  paymentGroupedName: string;
  factureBlob: Blob;
  factureName: string;
  updatedRefBlob: Blob;
  updatedRefName: string;
}

// ── Naming helpers ────────────────────────────────────────────────────

export function createdDateRange(rows: Row[]): string {
  return dateRangeStr(rows, 'Created');
}

export function refArchiveName(dlDate: string, rows: Row[]): string {
  return `${generateId()}_dl${dlDate}_cr${createdDateRange(rows)}_ref`;
}

export function invArchiveName(dlDate: string, rows: Row[], suffix: string): string {
  return `${generateId()}_dl${dlDate}_cr${createdDateRange(rows)}_inv${suffix.toLowerCase()}`;
}

// ── File loaders ───────────────────────────────────────────────────────

export async function loadReferenceFromFiles(
  files: File[],
  format: string
): Promise<Row[]> {
  const rows: Row[] = [];
  for (const file of files) {
    const parsed = await parseAnyFile(file, format === 'Csv' ? ';' : undefined);
    rows.push(...parsed);
  }
  return rows;
}

export function loadSingleFile(rows: Row[]): Row[] {
  return rows;
}

// ── Core helpers ───────────────────────────────────────────────────────

export function updateReferenceWithFact(refRows: Row[], factRows: Row[]): Row[] {
  const refAgi = refRows.filter((r) => r['MoP Code'] === 'AGI');
  const factAgi = factRows.filter((r) => r['MoP Code'] === 'AGI');

  const matchingCodes = new Set(
    refAgi
      .map((r) => r['Booking Code'])
      .filter((code) => factAgi.map((f) => f['Booking Code']).includes(code))
  );

  const refFiltered = refRows.filter(
    (r) => !(r['MoP Code'] === 'AGI' && matchingCodes.has(r['Booking Code']))
  );
  const factFiltered = factRows.filter(
    (r) => !(r['MoP Code'] === 'AGI' && matchingCodes.has(r['Booking Code']))
  );

  return [...refFiltered, ...factFiltered];
}

// ── Main pipeline ──────────────────────────────────────────────────────

export async function runPayment(params: PaymentRunParams): Promise<PaymentRunResult> {
  try {
    console.log('[STEP 1] Loading reference files...');
    console.log(`  - Files to load: ${params.refFiles.length}`);
    const refRows = await loadReferenceFromFiles(params.refFiles, 'Csv');
    console.log(`  ✓ Reference loaded: ${refRows.length} rows`);

    console.log('[STEP 2] Loading invoice file...');
    const factRows = await parseAnyFile(params.invoiceFile);
    console.log(`  ✓ Invoice loaded: ${factRows.length} rows`);

    let salesRows: Row[] = [];
    if (params.salesInvoiceFile) {
      console.log('[STEP 3] Loading sales file (optional)...');
      salesRows = await parseAnyFile(params.salesInvoiceFile);
      console.log(`  ✓ Sales loaded: ${salesRows.length} rows`);
    }

    console.log('[STEP 4] Trimming to column names...');
    const refRowsTrimmed = trimToColumns(refRows, COLUMN_NAMES);
    let factRowsTrimmed = trimToColumns(factRows, COLUMN_NAMES);
    console.log(`  ✓ Reference trimmed: ${refRowsTrimmed.length} rows`);
    console.log(`  ✓ Invoice trimmed: ${factRowsTrimmed.length} rows`);

    console.log('[STEP 5] Parsing datetime columns...');
    refRowsTrimmed.forEach((r) => {
      if (r['Created']) r['Created'] = new Date(r['Created']);
      if (r['Booking Created']) r['Booking Created'] = new Date(r['Booking Created']);
    });
    factRowsTrimmed.forEach((r) => {
      if (r['Created']) r['Created'] = new Date(r['Created']);
      if (r['Booking Created']) r['Booking Created'] = new Date(r['Booking Created']);
    });
    console.log(`  ✓ Datetime columns parsed`);

    console.log('[STEP 6] Filtering to invoice period...');
    const periodStart = new Date(params.periodStart);
    const periodEnd = new Date(params.periodEnd);
    periodEnd.setDate(periodEnd.getDate() + 1);
    console.log(`  - Period: ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`);

    const toBeInvoiced = factRowsTrimmed.filter((r) => {
      const created = r['Created'];
      return created >= periodStart && created < periodEnd;
    });
    console.log(`  ✓ Filtered rows: ${toBeInvoiced.length} invoices in period`);

  // 5. Handle AGI modifications
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

  // 6. Add GSA affectation columns
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
  const noteCleanupRegex = /Automatic (payrow|Revoke|PayEx payment|Denied PayEx payment|web payment)/g;
  const cleanedNotes = withGsaCols.map((row) => {
    const r = row as any;
    return {
      ...row,
      Notes: String(r['Notes'] || '').replace(noteCleanupRegex, ''),
    };
  });

    console.log('[STEP 7] Building payment grouped output...');
    const paymentGroupedName = `${generateId()} ${refArchiveName(params.factDate, cleanedNotes)} ${invArchiveName(params.factDate, cleanedNotes, '.csv')} PaymentGrouped.xlsx`;
    const paymentGroupedBlob = generateXlsxBlob([{ name: 'Payment', rows: cleanedNotes }]);
    console.log(`  ✓ PaymentGrouped: ${cleanedNotes.length} rows`);

    console.log('[STEP 8] Building facture (invoice)...');
    const invoiceData = buildInvoice(cleanedNotes);
    console.log(`  ✓ Invoice structure built: ${invoiceData.length} rows`);

    console.log('[STEP 9] Adding flag columns...');
    const withFlags = invoiceData.map((row) => ({
      ...row,
      'Est en modification': row['_booking_created'] < periodStart ? true : false,
      'Est en modification AGI': modifiedBookings.has(row['Code reservation']) ? true : false,
      'A un remboursement': Object.keys(row).some(
        (k) => k.endsWith(' -') && parseFloat(row[k]) !== 0
      ),
    }));
    console.log(`  ✓ Flag columns added`);

    console.log('[STEP 10] Removing temporary markers...');
    const withoutMarker = withFlags.map((row) => {
      const r = row as any;
      const { '_booking_created': _, ...rest } = r;
      return rest;
    });
    console.log(`  ✓ Markers removed`);

    console.log('[STEP 11] Dropping zero-value columns...');
    const skipCols = [
      'Code reservation',
      'A des notes',
      'Date creation',
      'Code agent',
      'Nom agent',
      'GSA agent',
      'Devise',
      'Statut reservation',
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
    console.log(`  ✓ Zero columns identified: ${dropZeroCols.size}`);

    const factureRows = withoutMarker.map((row) => {
      const newRow: Row = {};
      for (const [k, v] of Object.entries(row)) {
        if (!dropZeroCols.has(k)) {
          newRow[k] = v;
        }
      }
      return newRow;
    });
    console.log(`  ✓ Facture rows cleaned: ${factureRows.length} rows, ${Object.keys(factureRows[0] || {}).length} columns`);

    console.log('[STEP 12] Enriching with sales balance...');
    let enrichedFactureRows = factureRows;
    if (params.salesInvoiceFile) {
      enrichedFactureRows = enrichWithSalesBalance(factureRows, salesRows);
      console.log(`  ✓ Sales enrichment applied: ${salesRows.length} sales rows used`);
    } else {
      console.log(`  - Sales enrichment skipped (no sales file provided)`);
    }

    console.log('[STEP 13] Reordering columns...');
    const finalFactureRows = reorderColumns(enrichedFactureRows, [
      'Est en modification',
      'Est en modification AGI',
      'A un remboursement',
      'Statut reservation',
      'A des notes',
    ]);
    console.log(`  ✓ Columns reordered`);

    console.log('[STEP 14] Generating output files...');
    const factureName = `${generateId()} ${refArchiveName(params.factDate, cleanedNotes)} ${invArchiveName(params.factDate, cleanedNotes, '.csv')} Facture.xlsx`;
    const factureBlob = generateXlsxBlob([{ name: 'Facture', rows: finalFactureRows }]);
    console.log(`  ✓ Facture generated: ${factureBlob.size} bytes`);
    console.log(`  ✓ PaymentGrouped generated: ${paymentGroupedBlob.size} bytes`);

    console.log('[STEP 15] Updating reference snapshot...');
    const updatedRef = updateReferenceWithFact(refRowsTrimmed, factRowsTrimmed);
    const updatedRefName = `${refArchiveName(params.factDate, updatedRef)}.csv`;
    const updatedRefBlob = generateCsvBlob(updatedRef, ';');
    console.log(`  ✓ Reference updated: ${updatedRef.length} rows, ${updatedRefBlob.size} bytes`);

    console.log('[SUCCESS] Payment report generated successfully!');
    console.log(`  - PaymentGrouped: ${paymentGroupedName}`);
    console.log(`  - Facture: ${factureName}`);
    console.log(`  - Updated Reference: ${updatedRefName}`);

    return {
      paymentGroupedBlob,
      paymentGroupedName,
      factureBlob,
      factureName,
      updatedRefBlob,
      updatedRefName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[ERROR] Payment report generation failed!');
    console.error(`  Error: ${errorMessage}`);
    if (errorStack) console.error(`  Stack: ${errorStack}`);
    throw new Error(`Payment report failed: ${errorMessage}`);
  }
}

// ── Invoice building helpers ───────────────────────────────────────────

export function trimToColumns(rows: Row[], columns: string[]): Row[] {
  return rows.map((row) => {
    const newRow: Row = {};
    for (const col of columns) {
      newRow[col] = row[col] || '';
    }
    return newRow;
  });
}

function buildInvoice(rows: Row[]): Row[] {
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
      '_booking_created': firstRow['Booking Created'], // temporary marker
    };

    // Build SALE and REFUND columns
    for (const paymentType of PAYMENT_TYPES) {
      for (const point of POINTS) {
        const suffix = paymentType === 'REFUND' ? ' -' : '';
        const colName = point === 'Web' ? `${point}${suffix}` : `${point} DZD${suffix}`;

        const filtered = bookingRows.filter(
          (r) => r['Payment Type'] === paymentType && r['User GSA Affectation'] === point
        );

        if (point === 'Web') {
          invoice[colName] = sumBy(filtered, 'Payment Currency Amount');
        } else {
          // DZD
          const dzdSum = sumBy(
            filtered.filter((r) => r['Payment Currency'] === 'DZD'),
            'Payment Currency Amount'
          );
          invoice[colName] = dzdSum;

          // EUR
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

export function enrichWithSalesBalance(invoiceRows: Row[], salesRows: Row[]): Row[] {
  // Create a map of booking code -> solde
  const soldeMap = new Map<string, number>();
  const salesGrouped = groupBy(salesRows, 'Code reservation' as any);

  for (const [code, group] of salesGrouped) {
    if (group.length > 0) {
      const solde = parseFloat((group[group.length - 1]['Solde restant du'] || 0) as any) || 0;
      soldeMap.set(code, solde);
    }
  }

  // Insert Solde column after Devise
  const updated: Row[] = [];
  for (const row of invoiceRows) {
    const code = row['Code reservation'];
    const solde = soldeMap.get(code) || 0;
    updated.push({
      ...row,
      'Solde restant du': solde,
    } as Row);
  }

  // Append new booking codes from sales that aren't in invoice
  for (const [code, group] of salesGrouped) {
    if (!invoiceRows.some((r) => r['Code reservation'] === code)) {
      const salesRow = group[group.length - 1];
      const newRow: Row = {
        'Code reservation': code,
        'A des notes': false,
        'Date creation': salesRow['Date creation'],
        'Code agent': salesRow['Code agent'],
        'Nom agent': salesRow['Nom agent'],
        'GSA agent': salesRow['GSA agent'],
        'Devise': salesRow['Devise'],
        'Statut reservation': salesRow['Statut reservation'],
        'Solde restant du': parseFloat((salesRow['Solde restant du'] || 0) as any) || 0,
      };
      updated.push(newRow);
    }
  }

  return updated;
}

export function reorderColumns(rows: Row[], flagsToEnd: string[]): Row[] {
  if (rows.length === 0) return rows;

  const allKeys = Object.keys(rows[0]);
  const otherCols = allKeys.filter((k) => !flagsToEnd.includes(k));
  const presentFlags = flagsToEnd.filter((k) => allKeys.includes(k));
  const finalOrder = [...otherCols, ...presentFlags];

  return rows.map((row) => {
    const newRow: Row = {};
    for (const key of finalOrder) {
      newRow[key] = row[key];
    }
    return newRow;
  });
}
