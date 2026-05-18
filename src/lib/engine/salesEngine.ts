import {
  Row,
  generateId,
  round2,
  agencies,
  AgenciesMap,
} from './common';
import { parseAnyFile, generateXlsxBlob } from './fileLoaders';
import { groupBy, sumBy, pivotSum, dropZeroCols } from './pivotUtils';
import { generateInvoicePDF } from './pdfGenerator';
import gsaData from './gsaData.json';

// ── Constants ──────────────────────────────────────────────────────────

export const CUSTOM_PIVOT_ORDER_CODES = [
  'ADL',
  'CHD',
  'INF',
  'DOGK',
  'PS',
  'A2ED',
  'A2E',
  'A4E',
  'A6E',
  'B2I',
  'B4I',
  'BIKE',
  'MOTO',
  'CARH',
  'CARL',
  'CARM',
  'REM3',
  'REM6',
  'TRA1',
  'TRA2',
  'V1U4',
  'V1U5',
  'V1U6',
  'V1U9',
  'V2U4',
  'V2U5',
  'V2U6',
  'V2U9',
  'V3U4',
  'V3U5',
  'V3U6',
  'V3U9',
  'FUEL',
  'FUELV',
  'SECV',
  'PCONV',
  'PORTV',
  'SECP',
  'PCONP',
  'PORTP',
  'TAXH1',
  'TAXH2',
  'AMD',
  'CAN',
];

export const CUSTOM_PIVOT_ORDER_GROUPS = ['P', 'PR', 'K9', 'S', 'L', 'V', 'F'];

export const CUSTOM_PIVOT_ORDER_NAMES = [
  'Passengers',
  'Passengers PROMO RIH',
  'Vehicles',
  'Cabin',
  'Cabin M',
  'Cabin F',
  'Seats',
  'Pets',
  'Seat',
  'PAX avev GVIP',
  'GRATUITE CABINE',
  'Vehicule Gratuite',
];

// ── Types ──────────────────────────────────────────────────────────────

export interface SalesConfig {
  downloadDate: string;
  vatSuffix: string;
  format: string;
  mode: 'short' | 'detailed';
  onlyCheckedIn: boolean;
  splitByDeparture?: boolean;
  invoiceType?: 'GSA' | 'Agence';
}

export interface SalesRunResult {
  salesShortBlob: Blob;
  salesShortName: string;
  salesInvoiceBlob: Blob;
  salesInvoiceName: string;
  salesInvoiceControlBlob: Blob;
  salesInvoiceControlName: string;
  salesControlNourisBlob: Blob | null;
  salesControlNourisName: string;
  salesControlGsaBlob: Blob | null;
  salesControlGsaName: string;
  salesDetailedBlob: Blob | null;
  salesDetailedName: string;
  salesSplitByDepartureBlob: Blob | null;
  salesSplitByDepartureName: string;
  salesInvoicePdfs: Array<{ blob: Blob; name: string }>;
}

interface ShortResult {
  [key: string]: any;
}

// ── Main pipeline ──────────────────────────────────────────────────────

export async function runSales(config: SalesConfig, files: File[]): Promise<SalesRunResult> {
  // 1. Parse all files
  const delimiter = config.format === 'Csv' ? ';' : undefined;
  const allRows: Row[] = [];

  for (const file of files) {
    const parsed = await parseAnyFile(file, delimiter);
    allRows.push(...parsed);
  }

  // 2. Filter if needed
  let filtered = allRows;
  if (config.onlyCheckedIn) {
    filtered = allRows.filter((r) => r['Checked-In'] === true || r['Checked-In'] === 1);
  }

  // 3. Process per booking
  const bookingGrouped = groupBy(filtered, 'Booking code' as any);
  const shortResults: ShortResult[] = [];
  const detailedResults: ShortResult[] = [];

  for (const [, bookingRows] of bookingGrouped) {
    const result = extractBookingData(bookingRows, config.vatSuffix, agencies);
    shortResults.push(result.shortResult);

    if (config.mode === 'detailed') {
      detailedResults.push(result.detailedResult!);
    }
  }

  const dates = shortResults
    .map((r) => r['Date creation'] as string)
    .filter(Boolean)
    .sort();
  const dateRange = dates.length > 0
    ? `${dates[0]}~${dates[dates.length - 1]}`
    : 'unknown~unknown';

  // 4. Invoice reports
  const invoiceResult = generateInvoiceReport(shortResults);
  const invoiceName = `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesInvoice.xlsx`;
  const invoiceBlob = generateXlsxBlob([
    { name: 'Facture', rows: invoiceResult.factureRows },
    { name: 'Filtre_Controle', rows: invoiceResult.filtreRows },
    { name: 'Totaux', rows: invoiceResult.totauxRows },
  ]);

  // 5. Control reports
  const controlResult = generateInvoiceControlReport(shortResults);
  const controlName = `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesInvoiceControl.xlsx`;
  const controlBlob = generateXlsxBlob([{ name: 'Control', rows: controlResult }]);

  // 6. ACD reports
  const acdResult = generateControlReport(shortResults);
  let nourisBlob: Blob | null = null;
  let gsaBlob: Blob | null = null;
  let nourisName = '';
  let gsaName = '';

  if (acdResult.nourisSheets && Object.keys(acdResult.nourisSheets).length > 0) {
    nourisName = `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesControlNouris.xlsx`;
    const nourisSheets = Object.entries(acdResult.nourisSheets).map(([name, rows]) => ({
      name,
      rows: rows as Row[],
    }));
    nourisBlob = generateXlsxBlob(nourisSheets);
  }

  if (acdResult.gsaSheets && Object.keys(acdResult.gsaSheets).length > 0) {
    gsaName = `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesControlGsa.xlsx`;
    const gsaSheets = Object.entries(acdResult.gsaSheets).map(([name, rows]) => ({
      name,
      rows: rows as Row[],
    }));
    gsaBlob = generateXlsxBlob(gsaSheets);
  }

  // 7. Short report
  const shortName = `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesShort.xlsx`;
  const shortBlob = generateXlsxBlob([{ name: 'Sales', rows: shortResults }]);

  // 8. Detailed report (optional)
  let detailedBlob: Blob | null = null;
  let detailedName = '';
  if (config.mode === 'detailed' && detailedResults.length > 0) {
    detailedName = `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesDetailed.xlsx`;
    const cleaned = dropZeroCols(detailedResults, [
      'Code reservation',
      'Statut reservation',
      'Cree par',
      'Date creation',
      'Code agent',
      'Nom agent',
      'GSA agent',
      'GSA commission agent',
      'Nom client',
      'Prenom client',
      'Reference',
    ]);
    detailedBlob = generateXlsxBlob([{ name: 'Detailed', rows: cleaned }]);
  }

  // 9. Split by departure report (optional)
  let splitByDepartureBlob: Blob | null = null;
  let splitByDepartureName = '';
  if (config.splitByDeparture) {
    const splitResults = generateSplitByDepartureReport(shortResults);
    if (splitResults.length > 0) {
      splitByDepartureName = `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesByDeparture.xlsx`;
      splitByDepartureBlob = generateXlsxBlob([{ name: 'ByDeparture', rows: splitResults }]);
    }
  }

  // 10. Generate Invoice PDFs (one per GSA + currency combination)
  const salesInvoicePdfs: Array<{ blob: Blob; name: string }> = [];
  const invoiceType = config.invoiceType || 'Agence';

  if (shortResults.length > 0) {
    const gsaGrouped = groupBy(shortResults, 'GSA agent' as any);

    for (const [gsaName, gsaRows] of gsaGrouped) {
      const gsaLabel = gsaName || 'Unknown';
      const currencyGrouped = groupBy(gsaRows, 'Devise' as any);

      for (const [currency, currencyRows] of currencyGrouped) {
        try {
          const currencyLabel = currency || 'DZD';

          // Determine company info based on invoice type
          let issuingCompany = undefined;
          let billedGSA = undefined;
          let logoPath = '/logo_nouris.png';
          let stampPath = '/stamp_nouris.png';

          if (invoiceType === 'GSA') {
            // GSA mode: Nouris invoices the GSA
            issuingCompany = {
              name: 'Société de Transport Maritime de Voyageurs',
              companyLegal: 'SARL NOURIS ELBAHR MM',
              address: 'Coopérative des Communaux N° 40, Kouba, Alger',
              email: '',
              website: 'https://www.nouriselbahrferries.com/',
            };
            // Get GSA info from gsaData
            const gsaInfo = gsaData[gsaName as keyof typeof gsaData];
            if (gsaInfo) {
              billedGSA = {
                name: gsaInfo.name,
                address: gsaInfo.address,
                email: gsaInfo.email,
                website: gsaInfo.website,
              };
            }
          } else {
            // Agence mode: GSA invoices agencies - use GSA branding
            const gsaInfo = gsaData[gsaName as keyof typeof gsaData];
            if (gsaInfo) {
              issuingCompany = {
                name: gsaInfo.name,
                address: gsaInfo.address,
                email: gsaInfo.email,
                website: gsaInfo.website,
              };
              logoPath = `/logo_${gsaInfo.id.toLowerCase()}.png`;
              stampPath = `/stamp_${gsaInfo.id.toLowerCase()}.png`;
            }
          }

          const blob = await generateInvoicePDF({
            companyInfo: {
              name: invoiceType === 'GSA' ? gsaLabel : currencyRows[0]['Code agent'] || 'N/A',
              agentCode: currencyRows[0]['Code agent'] || 'N/A',
              gsa: gsaLabel,
            },
            invoiceDetails: {
              invoiceNumber: `${config.downloadDate.replace(/-/g, '')}00001`,
              invoiceDate: config.downloadDate,
              dueDate: new Date(new Date(config.downloadDate).getTime() + 15 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
              currency: currencyLabel,
            },
            bookingsData: currencyRows,
            invoiceType,
            issuingCompany,
            billedGSA,
            logoPath,
            stampPath,
          });

          const safeName = gsaLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
          const typeLabel = invoiceType === 'GSA' ? 'GSA' : 'Agence';
          salesInvoicePdfs.push({
            blob,
            name: `${generateId()}_dl${config.downloadDate}_cr${dateRange}_SalesInvoice_${safeName}_${typeLabel}_${currencyLabel}.pdf`,
          });
        } catch (error) {
          console.error(`Error generating PDF for GSA ${gsaName} / Currency ${currency}:`, error);
        }
      }
    }
  }

  return {
    salesShortBlob: shortBlob,
    salesShortName: shortName,
    salesInvoiceBlob: invoiceBlob,
    salesInvoiceName: invoiceName,
    salesInvoiceControlBlob: controlBlob,
    salesInvoiceControlName: controlName,
    salesControlNourisBlob: nourisBlob,
    salesControlNourisName: nourisName,
    salesControlGsaBlob: gsaBlob,
    salesControlGsaName: gsaName,
    salesDetailedBlob: detailedBlob,
    salesDetailedName: detailedName,
    salesSplitByDepartureBlob: splitByDepartureBlob,
    salesSplitByDepartureName: splitByDepartureName,
    salesInvoicePdfs,
  };
}

// ── Booking extraction ─────────────────────────────────────────────────

interface ExtractResult {
  shortResult: ShortResult;
  detailedResult?: ShortResult;
}

function extractBookingData(
  bookingRows: Row[],
  vatSuffix: string,
  agenciesMap: AgenciesMap
): ExtractResult {
  const priceCol = `Price Excl${vatSuffix}`;
  const firstRow = bookingRows[0];

  // Base info
  const bookingCode = firstRow['Booking code'];
  const bookingUser = firstRow['Created By User'];
  const bookingAgentCode = firstRow['Agent Code'];
  const bookingAgentName = firstRow['Agent Name'];
  const bookingCustomerName = firstRow['Customer Name'] || '';
  const bookingCustomerFirstName = firstRow['Customer First Name'] || '';
  const bookingCreationDate = firstRow['Booking Created Time'];
  const bookingStatus = firstRow['Booking Status'];
  const bookingCurrency = firstRow['Currency'];
  const bookingRef = firstRow['Booking Ref.'];

  // Agency info
  const agencyData = agenciesMap[bookingAgentCode];
  const bookingAgentGsa = agencyData?.gsa || '';
  const bookingAgentGsaCommission = agencyData?.commission || 0;
  const bookingAgentCurrencyMismatched =
    agencyData && agencyData.currency !== bookingCurrency;

  // Aggregations
  const amountsByCode = pivotSum(
    bookingRows,
    'Category Code',
    priceCol,
    CUSTOM_PIVOT_ORDER_CODES,
    true,
    0
  );

  const amountsByGroup = pivotSum(
    bookingRows,
    'Category Group Code',
    priceCol,
    CUSTOM_PIVOT_ORDER_GROUPS,
    true,
    0
  );

  // Category group with spec
  const withSpec = bookingRows.map((r) => ({
    ...r,
    'Category Group Name': `${r['Category Group Name'] || ''} ${r['Category Specification Code'] || ''}`.trim(),
  }));

  const qtyByName = pivotSum(
    withSpec,
    'Category Group Name',
    'Category Quantity',
    CUSTOM_PIVOT_ORDER_NAMES,
    false,
    0
  );

  // Passenger & vehicle counts
  const countP = sumBy(
    bookingRows.filter((r) => r['Category Group Code'] === 'P'),
    'Category Quantity'
  );
  const countPRih = sumBy(
    bookingRows.filter((r) => r['Category Group Code'] === 'PR'),
    'Category Quantity'
  );
  const countVt = sumBy(
    bookingRows.filter((r) => r['Category Code'] === 'CARL'),
    'Category Quantity'
  );
  const countVc = sumBy(
    bookingRows.filter((r) =>
      ['CARM', 'CARH'].includes(r['Category Code'])
    ),
    'Category Quantity'
  );
  const countVa = sumBy(
    bookingRows.filter(
      (r) =>
        r['Category Group Code'] === 'V' &&
        !['CARL', 'CARM', 'CARH'].includes(r['Category Code'])
    ),
    'Category Quantity'
  );

  // Installation counts (Cabin, Beds, Chairs)
  const countC = (qtyByName['Cabin'] || 0);
  const countL = ((qtyByName['Cabin M'] || 0) + (qtyByName['Cabin F'] || 0));
  const countF = (qtyByName['Seat'] || 0);

  // Scalars
  const total = sumBy(bookingRows, priceCol);
  const balance = parseFloat(firstRow['Payment Balance']) || 0;
  const commission = sumBy(bookingRows, 'Commission');

  // Manual price flags
  const manualPriceWithoutFees =
    bookingRows
      .filter((r) =>
        ['V', 'PR', 'P', 'K9', 'L', 'S'].includes(r['Category Group Code'])
      )
      .some((r) => parseFloat(r['Manual Price']) > 0) || false;

  const manualPriceFees =
    bookingRows
      .filter((r) => r['Category Group Code'] === 'F')
      .some((r) => parseFloat(r['Manual Price']) > 0) || false;

  // Departure split
  const departTimes = [...new Set(bookingRows.map((r) => r['Departure Time']).filter((t) => t))];
  departTimes.sort();

  let alCode = '';
  let alChk = false;
  let reCode = '';
  let reChk = false;

  if (departTimes.length === 1) {
    const journeyRows = bookingRows.filter((r) => r['Departure Time'] === departTimes[0]);
    const journeyCodes = journeyRows.map((r) => r['Journey Code']).join(',');

    if (journeyCodes.includes('ALG') || journeyCodes.includes('ORN')) {
      alCode = journeyRows[0]?.['Departure Code'] || '';
      alChk = journeyRows.some((r) => r['Checked-In'] === true || r['Checked-In'] === 1);
    }
    if (journeyCodes.includes('MAR') || journeyCodes.includes('ALC')) {
      reCode = journeyRows[0]?.['Departure Code'] || '';
      reChk = journeyRows.some((r) => r['Checked-In'] === true || r['Checked-In'] === 1);
    }
  } else if (departTimes.length >= 2) {
    const alRows = bookingRows.filter((r) => r['Departure Time'] === departTimes[0]);
    const reRows = bookingRows.filter((r) => r['Departure Time'] === departTimes[1]);

    alCode = alRows[0]?.['Departure Code'] || '';
    alChk = alRows.some((r) => r['Checked-In'] === true || r['Checked-In'] === 1);

    reCode = reRows[0]?.['Departure Code'] || '';
    reChk = reRows.some((r) => r['Checked-In'] === true || r['Checked-In'] === 1);
  }

  // HT calculation
  const ht =
    total -
    (amountsByCode['FUEL'] || 0) -
    (amountsByCode['SECP'] || 0) -
    (amountsByCode['PCONP'] || 0) -
    (amountsByCode['PORTP'] || 0) -
    (amountsByCode['FUELV'] || 0) -
    (amountsByCode['SECV'] || 0) -
    (amountsByCode['PCONV'] || 0) -
    (amountsByCode['PORTV'] || 0) -
    (amountsByCode['TAXH1'] || 0) -
    (amountsByCode['TAXH2'] || 0) -
    (amountsByCode['AMD'] || 0) -
    (amountsByCode['CAN'] || 0);

  // HT breakdown by category type
  const htP = round2((amountsByGroup['P'] || 0) + (amountsByGroup['PR'] || 0));
  const htV = round2(amountsByGroup['V'] || 0);

  // Installation breakdown (Cabin, Beds, Chairs)
  // Apply same Category Specification Code transformation as quantities
  const htC = round2(sumBy(
    bookingRows.filter((r) => {
      const modifiedName = `${r['Category Group Name'] || ''} ${r['Category Specification Code'] || ''}`.trim();
      return modifiedName === 'Cabin';
    }),
    priceCol
  ));
  const htL = round2(sumBy(
    bookingRows.filter((r) => {
      const modifiedName = `${r['Category Group Name'] || ''} ${r['Category Specification Code'] || ''}`.trim();
      return ['Cabin M', 'Cabin F'].includes(modifiedName);
    }),
    priceCol
  ));
  const htF = round2(amountsByGroup['S'] || 0);

  const htA = round2(amountsByGroup['K9'] || 0);
  const htX = round2(ht - htP - htV - htC - htL - htF - htA);

  // Commission calculation
  const calculatedCommission = round2(
    ((amountsByCode['TAXH1'] || 0) +
      (amountsByCode['TAXH2'] || 0) +
      (amountsByCode['AMD'] || 0) +
      (amountsByCode['CAN'] || 0) +
      ht) *
      bookingAgentGsaCommission
  );
  const commissionDiff = round2(commission - calculatedCommission);

  const shortResult: ShortResult = {
    'Code reservation': bookingCode,
    'Statut reservation': bookingStatus,
    'Cree par': bookingUser,
    'Date creation': bookingCreationDate,
    'Code agent': bookingAgentCode,
    'Nom agent': bookingAgentName,
    'GSA agent': bookingAgentGsa,
    'GSA commission agent': bookingAgentGsaCommission,
    'Nom client': bookingCustomerName,
    'Prenom client': bookingCustomerFirstName,
    Reference: bookingRef,
    'Nombre passagers': countP,
    'Nombre passagers RIH': countPRih,
    'Nombre véhicules touristique': countVt,
    'Nombre véhicules commercial': countVc,
    "Nombre d'autre véhicules": countVa,
    'Nombre cabine': countC,
    'Nombre lit': countL,
    'Nombre fauteuil': countF,
    'Code depart aller': alCode,
    'Check-in aller': alChk,
    'Code depart retour': reCode,
    'Check-in retour': reChk,
    Devise: bookingCurrency,
    'Montant HT Passagers': htP,
    'Montant HT Véhicule': htV,
    'Montant HT Installation Cabin': htC,
    'Montant HT Installation Lit': htL,
    'Montant HT Installation Fauteuil': htF,
    'Montant HT Animaux et extra': htA,
    'Montant HT Autres': htX,
    'Frais carburant vehicule': round2(amountsByCode['FUELV'] || 0),
    'Frais carburant': round2(amountsByCode['FUEL'] || 0),
    'Frais passagers': round2(
      (amountsByCode['SECP'] || 0) + (amountsByCode['PCONP'] || 0) + (amountsByCode['PORTP'] || 0)
    ),
    'Frais vehicule': round2(
      (amountsByCode['SECV'] || 0) + (amountsByCode['PCONV'] || 0) + (amountsByCode['PORTV'] || 0)
    ),
    'Frais hauteur': round2((amountsByCode['TAXH1'] || 0) + (amountsByCode['TAXH2'] || 0)),
    'Frais modification': round2(amountsByCode['AMD'] || 0),
    'Frais annulation': round2(amountsByCode['CAN'] || 0),
    'Montant HT': round2(ht),
    'Montant TTC': round2(total),
    'Solde restant du': balance,
    'Commission agent': round2(commission),
    'Commission calculer agent': calculatedCommission,
    'Commission diff agent': commissionDiff,
    'Tarif manuel HT': manualPriceWithoutFees,
    'Tarif manuel Frais': manualPriceFees,
    'Devise incompatible': bookingAgentCurrencyMismatched || false,
  };

  const detailedResult = { ...shortResult };
  for (const [k, v] of Object.entries(amountsByCode)) {
    detailedResult[`amt_code_${k}`] = v;
  }
  for (const [k, v] of Object.entries(amountsByGroup)) {
    detailedResult[`amt_group_${k}`] = v;
  }
  for (const [k, v] of Object.entries(qtyByName)) {
    detailedResult[`qty_${k}`] = v;
  }

  return { shortResult, detailedResult };
}

// ── Invoice report generation ──────────────────────────────────────────

interface InvoiceReportResult {
  factureRows: Row[];
  filtreRows: Row[];
  totauxRows: Row[];
}

function generateInvoiceReport(rows: Row[]): InvoiceReportResult {
  const testPattern = /^(?:(?:test|tes|tst|teste|testing|etst|testx|tesqt|teset|teqt|cas|carpack|ok)(?:\s(?:test|tes|tst|teste|testing|etst|testx|tesqt|teset|teqt|cas|carpack|ok))?|([a-z])\1{1,}(?:\s([a-z])\2{1,})?|\. \.)$/i;
  const listePattern = /liste(?:\s+d['\s]?attente(?:\s+\w+)?)?/i;
  const directionPattern = /direction(?:\s+generale)?/i;

  const withCaseFlags: any[] = rows.map((r) => {
    const notCheckedIn = !r['Check-in aller'] && !r['Check-in retour'];
    return {
      ...r,
      'Cas de test':
        notCheckedIn &&
        (!(r['Nom client'] || r['Prenom client']) ||
          testPattern.test(r['Nom client']) ||
          testPattern.test(r['Prenom client']) ||
          ['TEST5', 'TESTWEB'].includes(r['Code agent'])),
      'Cas de liste dattente':
        notCheckedIn &&
        (listePattern.test(r['Nom client']) || listePattern.test(r['Prenom client'])),
      'Cas de direction generale':
        notCheckedIn &&
        (directionPattern.test(r['Nom client']) ||
          directionPattern.test(r['Prenom client'])),
    };
  });

  const caseFlags = ['Cas de test', 'Cas de liste dattente', 'Cas de direction generale'];
  const filtreRows = withCaseFlags.filter((r) =>
    caseFlags.some((f) => r[f] === true)
  );

  const factureRows: Row[] = withCaseFlags.map((r) => {
    const { ...rest } = r;
    caseFlags.forEach((f) => delete rest[f]);
    return rest;
  });

  const sansFlagsRows: any[] = factureRows.filter((r) => !withCaseFlags.some((wc) => wc['Code reservation'] === r['Code reservation'] && caseFlags.some((f) => wc[f] === true)));

  // Totaux sheet
  const withGsaFinal: any[] = sansFlagsRows.map((r) => ({
    ...r,
    'GSA_final': r['GSA agent'] === 'Siege' ? r['Cree par'] : r['GSA agent'],
  }));

  const withSoldes: any[] = withGsaFinal.map((r) => ({
    ...r,
    'Solde_pos': Math.max(r['Solde restant du'], 0),
    'Solde_neg': Math.min(r['Solde restant du'], 0),
  }));

  const groupedByGsa = groupBy(withSoldes, 'GSA_final' as any);
  const totauxRows: Row[] = [];

  for (const [gsaKey, gsaRows] of groupedByGsa) {
    const deviceGrouped = groupBy(gsaRows, 'Devise' as any);

    for (const [devise, devRows] of deviceGrouped) {
      const row: any = {
        GSA: gsaKey,
        Devise: devise,
        'Montant TTC': round2(sumBy(devRows, 'Montant TTC')),
        'Commission agent': round2(sumBy(devRows, 'Commission agent')),
        'Commission calculer agent': round2(sumBy(devRows, 'Commission calculer agent')),
        'Solde positif': round2(sumBy(devRows, 'Solde_pos')),
        'Solde negatif': round2(sumBy(devRows, 'Solde_neg')),
      };
      totauxRows.push(row);
    }
  }

  return { factureRows, filtreRows, totauxRows };
}

// ── Invoice control report ─────────────────────────────────────────────

function generateInvoiceControlReport(rows: Row[]): Row[] {
  const typedRows = rows as any[];
  return typedRows
    .map((r) => ({
      ...r,
      'Solde positif': r['Solde restant du'] > 0,
      'Solde negatif': r['Solde restant du'] < 0,
      'Commission nulle': r['Commission agent'] === 0 && r['GSA agent'] !== 'Siege',
      'Commission differente': r['Commission diff agent'] !== 0,
      'Sans frais':
        r['Frais carburant'] === 0 &&
        r['Statut reservation'] !== 'CAN',
    }))
    .filter((r: any) =>
      [
        'Solde positif',
        'Solde negatif',
        'Commission nulle',
        'Commission differente',
        'Sans frais',
      ].some((flag) => r[flag] === true)
    );
}

// ── Control report (ACD) ───────────────────────────────────────────────

interface ControlReportResult {
  nourisSheets: Record<string, Row[]>;
  gsaSheets: Record<string, Row[]>;
}

function generateControlReport(rows: Row[]): ControlReportResult {
  const nourisRows = rows.filter((r) => r['GSA agent'] === 'Siege');
  const gsaRows = rows.filter((r) => r['GSA agent'] !== 'Siege');

  const nourisSheets: Record<string, Row[]> = {};
  const gsaSheets: Record<string, Row[]> = {};

  // ACD logic
  const acdRowsNouris = nourisRows.filter(
    (r) => r['Devise'] === 'DZD' && (r['Code depart aller']?.startsWith('ALC') || r['Code depart aller']?.startsWith('MAR'))
  );
  const acdRowsGsa = gsaRows.filter(
    (r) => r['Devise'] === 'DZD' && (r['Code depart aller']?.startsWith('ALC') || r['Code depart aller']?.startsWith('MAR'))
  );

  if (acdRowsNouris.length > 0) {
    const withRefNouris = acdRowsNouris.filter((r) => r['Reference']);
    const withoutRefNouris = acdRowsNouris.filter((r) => !r['Reference']);

    const refGrouped = groupBy(withRefNouris, 'Reference' as any);
    nourisSheets['Cas_ACD_Ref_Doublon'] = [...refGrouped]
      .filter(([, group]) => group.length > 1)
      .flatMap(([, group]) => group);
    nourisSheets['Cas_ACD_Ref_Unique'] = [...refGrouped]
      .filter(([, group]) => group.length === 1)
      .flatMap(([, group]) => group);
    nourisSheets['Cas_ACD_Sans_Ref'] = withoutRefNouris;
  }

  if (acdRowsGsa.length > 0) {
    const withRefGsa = acdRowsGsa.filter((r) => r['Reference']);
    const withoutRefGsa = acdRowsGsa.filter((r) => !r['Reference']);

    const refGrouped = groupBy(withRefGsa, 'Reference' as any);
    gsaSheets['Cas_ACD_Ref_Doublon'] = [...refGrouped]
      .filter(([, group]) => group.length > 1)
      .flatMap(([, group]) => group);
    gsaSheets['Cas_ACD_Ref_Unique'] = [...refGrouped]
      .filter(([, group]) => group.length === 1)
      .flatMap(([, group]) => group);
    gsaSheets['Cas_ACD_Sans_Ref'] = withoutRefGsa;
  }

  // Other anomalies
  const memeTrajetNouris = nourisRows.filter(
    (r) =>
      r['Code depart aller'] &&
      r['Code depart retour'] &&
      r['Code depart aller'].substring(0, 3).toUpperCase() ===
        r['Code depart retour'].substring(0, 3).toUpperCase()
  );
  if (memeTrajetNouris.length > 0) nourisSheets['Meme_Trajet'] = memeTrajetNouris;

  const memeTrajetGsa = gsaRows.filter(
    (r) =>
      r['Code depart aller'] &&
      r['Code depart retour'] &&
      r['Code depart aller'].substring(0, 3).toUpperCase() ===
        r['Code depart retour'].substring(0, 3).toUpperCase()
  );
  if (memeTrajetGsa.length > 0) gsaSheets['Meme_Trajet'] = memeTrajetGsa;

  const devMismatchNouris = nourisRows.filter((r) => r['Devise incompatible']);
  if (devMismatchNouris.length > 0) nourisSheets['Devise_Incompatible'] = devMismatchNouris;

  const devMismatchGsa = gsaRows.filter((r) => r['Devise incompatible']);
  if (devMismatchGsa.length > 0) gsaSheets['Devise_Incompatible'] = devMismatchGsa;

  const tarifNouris = nourisRows.filter(
    (r) => r['Tarif manuel HT'] === true || r['Tarif manuel Frais'] === true
  );
  if (tarifNouris.length > 0) nourisSheets['Tarif_Manuel'] = tarifNouris;

  const tarifGsa = gsaRows.filter(
    (r) => r['Tarif manuel HT'] === true || r['Tarif manuel Frais'] === true
  );
  if (tarifGsa.length > 0) gsaSheets['Tarif_Manuel'] = tarifGsa;

  return { nourisSheets, gsaSheets };
}

// ── Split by departure report ──────────────────────────────────────────

function generateSplitByDepartureReport(rows: Row[]): Row[] {
  const result: Row[] = [];

  for (const row of rows) {
    const hasAller = row['Code depart aller'] || row['Check-in aller'];
    const hasRetour = row['Code depart retour'] || row['Check-in retour'];

    if (hasAller) {
      result.push({
        'Code reservation': row['Code reservation'],
        'Statut reservation': row['Statut reservation'],
        'Cree par': row['Cree par'],
        'Date creation': row['Date creation'],
        'Code agent': row['Code agent'],
        'Nom agent': row['Nom agent'],
        'GSA agent': row['GSA agent'],
        'GSA commission agent': row['GSA commission agent'],
        'Nom client': row['Nom client'],
        'Prenom client': row['Prenom client'],
        'Nombre passagers': row['Nombre passagers'],
        'Nombre passagers RIH': row['Nombre passagers RIH'],
        'Nombre véhicules touristique': row['Nombre véhicules touristique'],
        'Nombre véhicules commercial': row['Nombre véhicules commercial'],
        "Nombre d'autre véhicules": row["Nombre d'autre véhicules"],
        'Nombre cabine': row['Nombre cabine'],
        'Nombre lit': row['Nombre lit'],
        'Nombre fauteuil': row['Nombre fauteuil'],
        Reference: row['Reference'],
        'Code depart': row['Code depart aller'],
        'Check-in': row['Check-in aller'],
        Devise: row['Devise'],
        'Montant HT Passagers': row['Montant HT Passagers'],
        'Montant HT Véhicule': row['Montant HT Véhicule'],
        'Montant HT Installation Cabin': row['Montant HT Installation Cabin'],
        'Montant HT Installation Lit': row['Montant HT Installation Lit'],
        'Montant HT Installation Fauteuil': row['Montant HT Installation Fauteuil'],
        'Montant HT Animaux et extra': row['Montant HT Animaux et extra'],
        'Montant HT Autres': row['Montant HT Autres'],
        'Frais carburant vehicule': row['Frais carburant vehicule'],
        'Frais carburant': row['Frais carburant'],
        'Frais passagers': row['Frais passagers'],
        'Frais vehicule': row['Frais vehicule'],
        'Frais hauteur': row['Frais hauteur'],
        'Frais modification': row['Frais modification'],
        'Frais annulation': row['Frais annulation'],
        'Montant HT': row['Montant HT'],
        'Montant TTC': row['Montant TTC'],
        'Solde restant du': row['Solde restant du'],
        'Commission agent': row['Commission agent'],
        'Commission calculer agent': row['Commission calculer agent'],
        'Commission diff agent': row['Commission diff agent'],
        'Tarif manuel HT': row['Tarif manuel HT'],
        'Tarif manuel Frais': row['Tarif manuel Frais'],
        'Devise incompatible': row['Devise incompatible'],
      });
    }

    if (hasRetour) {
      result.push({
        'Code reservation': row['Code reservation'],
        'Statut reservation': row['Statut reservation'],
        'Cree par': row['Cree par'],
        'Date creation': row['Date creation'],
        'Code agent': row['Code agent'],
        'Nom agent': row['Nom agent'],
        'GSA agent': row['GSA agent'],
        'GSA commission agent': row['GSA commission agent'],
        'Nom client': row['Nom client'],
        'Prenom client': row['Prenom client'],
        'Nombre passagers': row['Nombre passagers'],
        'Nombre passagers RIH': row['Nombre passagers RIH'],
        'Nombre véhicules touristique': row['Nombre véhicules touristique'],
        'Nombre véhicules commercial': row['Nombre véhicules commercial'],
        "Nombre d'autre véhicules": row["Nombre d'autre véhicules"],
        'Nombre cabine': row['Nombre cabine'],
        'Nombre lit': row['Nombre lit'],
        'Nombre fauteuil': row['Nombre fauteuil'],
        Reference: row['Reference'],
        'Code depart': row['Code depart retour'],
        'Check-in': row['Check-in retour'],
        Devise: row['Devise'],
        'Montant HT Passagers': row['Montant HT Passagers'],
        'Montant HT Véhicule': row['Montant HT Véhicule'],
        'Montant HT Installation Cabin': row['Montant HT Installation Cabin'],
        'Montant HT Installation Lit': row['Montant HT Installation Lit'],
        'Montant HT Installation Fauteuil': row['Montant HT Installation Fauteuil'],
        'Montant HT Animaux et extra': row['Montant HT Animaux et extra'],
        'Montant HT Autres': row['Montant HT Autres'],
        'Frais carburant vehicule': row['Frais carburant vehicule'],
        'Frais carburant': row['Frais carburant'],
        'Frais passagers': row['Frais passagers'],
        'Frais vehicule': row['Frais vehicule'],
        'Frais hauteur': row['Frais hauteur'],
        'Frais modification': row['Frais modification'],
        'Frais annulation': row['Frais annulation'],
        'Montant HT': row['Montant HT'],
        'Montant TTC': row['Montant TTC'],
        'Solde restant du': row['Solde restant du'],
        'Commission agent': row['Commission agent'],
        'Commission calculer agent': row['Commission calculer agent'],
        'Commission diff agent': row['Commission diff agent'],
        'Tarif manuel HT': row['Tarif manuel HT'],
        'Tarif manuel Frais': row['Tarif manuel Frais'],
        'Devise incompatible': row['Devise incompatible'],
      });
    }
  }

  return result;
}
