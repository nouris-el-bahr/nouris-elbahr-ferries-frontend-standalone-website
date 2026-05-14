'use client';

import { Row } from './common';

interface InvoiceDetails {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
}

interface CompanyInfo {
  name: string;
  agentCode: string;
  gsa: string;
}

interface PDFGeneratorOptions {
  companyInfo: CompanyInfo;
  invoiceDetails: InvoiceDetails;
  bookingsData: Row[];
}

interface MappedValues {
  'Code réservation': string;
  'Date création': string;
  'Montant HT Passagers': number;
  'Montant HT Véhicule': number;
  'Montant HT Installation Cabin': number;
  'Montant HT Installation Lit': number;
  'Montant HT Installation Fauteuil': number;
  'Montant HT Animaux et extra': number;
  'Montant HT Autres': number;
  'Frais carburant véhicule': number;
  'Frais carburant': number;
  'Frais passagers': number;
  'Frais hauteur': number;
  'Frais modification': number;
  'Montant TTC': number;
  'Commission calculer agent': number;
}

function formatNumber(value: number): string {
  return value.toFixed(2);
}

function extractRowValues(row: Row): MappedValues {
  const dateCreation = row['Date creation'] ? row['Date creation'].split('T')[0] : '';

  return {
    'Code réservation': row['Code reservation'] || '',
    'Date création': dateCreation,
    'Montant HT Passagers': Number(row['Montant HT Passagers'] || 0),
    'Montant HT Véhicule': Number(row['Montant HT Véhicule'] || 0),
    'Montant HT Installation Cabin': Number(row['Montant HT Installation Cabin'] || 0),
    'Montant HT Installation Lit': Number(row['Montant HT Installation Lit'] || 0),
    'Montant HT Installation Fauteuil': Number(row['Montant HT Installation Fauteuil'] || 0),
    'Montant HT Animaux et extra': Number(row['Montant HT Animaux et extra'] || 0),
    'Montant HT Autres': Number(row['Montant HT Autres'] || 0),
    'Frais carburant véhicule': Number(row['Frais carburant vehicule'] || 0),
    'Frais carburant': Number(row['Frais carburant'] || 0),
    'Frais passagers': Number(row['Frais passagers'] || 0),
    'Frais hauteur': Number(row['Frais hauteur'] || 0),
    'Frais modification': Number(row['Frais modification'] || 0),
    'Montant TTC': Number(row['Montant TTC'] || 0),
    'Commission calculer agent': Number(row['Commission calculer agent'] || 0),
  };
}

export async function generateInvoicePDF(options: PDFGeneratorOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({
    orientation: 'l',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;

  // Draw top right decorative bands
  const bandWidth = 35;
  const bandHeight = 4;
  const bandStartX = pageWidth - bandWidth - 8;
  const bandColor = [31, 41, 102]; // Dark blue

  pdf.setFillColor(bandColor[0], bandColor[1], bandColor[2]);
  pdf.rect(bandStartX, 8, bandWidth, bandHeight, 'F');
  pdf.rect(bandStartX, 14, bandWidth, bandHeight, 'F');
  pdf.rect(bandStartX, 20, bandWidth, bandHeight, 'F');

  // Load and add logo (left side)
  try {
    const logoResponse = await fetch('/logo_zaatcha.png');
    const logoBlob = await logoResponse.blob();
    const logoUrl = URL.createObjectURL(logoBlob);
    pdf.addImage(logoUrl, 'PNG', margin, 8, 30, 30);
  } catch (error) {
    console.warn('Logo not found');
  }

  // Load and add stamp (right side)
  try {
    const stampResponse = await fetch('/stamp_zaatcha.png');
    const stampBlob = await stampResponse.blob();
    const stampUrl = URL.createObjectURL(stampBlob);
    pdf.addImage(stampUrl, 'PNG', pageWidth - 50, 8, 35, 35);
  } catch (error) {
    console.warn('Stamp not found');
  }

  // Center column: Invoice details
  let yPos = 12;
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Agent Invoice', 55, yPos);
  yPos += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Invoice No: ${options.invoiceDetails.invoiceNumber}`, 55, yPos);
  yPos += 4;
  pdf.text(`Invoice Date: ${options.invoiceDetails.invoiceDate}`, 55, yPos);
  yPos += 4;
  pdf.text(`Due Date: ${options.invoiceDetails.dueDate}`, 55, yPos);
  yPos += 4;
  pdf.text(`Currency: ${options.invoiceDetails.currency}`, 55, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Billed To:', 55, yPos);
  yPos += 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Agent Code: ${options.companyInfo.agentCode}`, 55, yPos);
  yPos += 4;
  pdf.text(`Agent Name: ${options.companyInfo.name}`, 55, yPos);
  yPos += 4;
  pdf.text(`GSA: ${options.companyInfo.gsa}`, 55, yPos);

  // Right column: Company info
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Zaatcha Voyages Kouba', pageWidth - 55, 12);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const companyInfoLines = [
    'Coop les communaux Villa N 40, Kouba, Algiers -ALGERIA-',
    'Contact@Zaatchavoyages.com',
    'www.zaatchavoyages.com',
  ];

  let infoY = 16;
  for (const line of companyInfoLines) {
    pdf.text(line, pageWidth - 55, infoY, { maxWidth: 50, align: 'left' });
    infoY += 4;
  }

  // Table section
  const headers = [
    'Code Rés.', 'Date Créa.', 'PAX HT', 'VEH HT', 'Cabin',
    'Lit', 'Fauteuil', 'Animaux', 'Autres', 'Carb.Veh', 'Carb.Other',
    'Frais PAX', 'Frais Haut.', 'Frais Mod.', 'TTC', 'Devise', 'Commission'
  ];

  const autresValues: number[] = [];
  const tableData: string[][] = [];
  const totals: Record<string, number> = {
    'PAX HT': 0,
    'VEH HT': 0,
    'Cabin': 0,
    'Lit': 0,
    'Fauteuil': 0,
    'Animaux': 0,
    'Autres': 0,
    'Carb.Veh': 0,
    'Carb.Other': 0,
    'Frais PAX': 0,
    'Frais Haut.': 0,
    'Frais Mod.': 0,
    'TTC': 0,
    'Commission': 0,
  };

  for (const row of options.bookingsData) {
    const values = extractRowValues(row);
    autresValues.push(values['Montant HT Autres']);

    const tableRow = [
      values['Code réservation'],
      values['Date création'],
      formatNumber(values['Montant HT Passagers']),
      formatNumber(values['Montant HT Véhicule']),
      formatNumber(values['Montant HT Installation Cabin']),
      formatNumber(values['Montant HT Installation Lit']),
      formatNumber(values['Montant HT Installation Fauteuil']),
      formatNumber(values['Montant HT Animaux et extra']),
      formatNumber(values['Montant HT Autres']),
      formatNumber(values['Frais carburant véhicule']),
      formatNumber(values['Frais carburant']),
      formatNumber(values['Frais passagers']),
      formatNumber(values['Frais hauteur']),
      formatNumber(values['Frais modification']),
      formatNumber(values['Montant TTC']),
      row['Devise'] || options.invoiceDetails.currency,
      formatNumber(values['Commission calculer agent']),
    ];

    tableData.push(tableRow);

    totals['PAX HT'] += values['Montant HT Passagers'];
    totals['VEH HT'] += values['Montant HT Véhicule'];
    totals['Cabin'] += values['Montant HT Installation Cabin'];
    totals['Lit'] += values['Montant HT Installation Lit'];
    totals['Fauteuil'] += values['Montant HT Installation Fauteuil'];
    totals['Animaux'] += values['Montant HT Animaux et extra'];
    totals['Autres'] += values['Montant HT Autres'];
    totals['Carb.Veh'] += values['Frais carburant véhicule'];
    totals['Carb.Other'] += values['Frais carburant'];
    totals['Frais PAX'] += values['Frais passagers'];
    totals['Frais Haut.'] += values['Frais hauteur'];
    totals['Frais Mod.'] += values['Frais modification'];
    totals['TTC'] += values['Montant TTC'];
    totals['Commission'] += values['Commission calculer agent'];
  }

  const removeAutres = autresValues.every(v => v === 0);
  let displayHeaders = headers;
  let displayData = tableData;

  if (removeAutres) {
    const autresIdx = headers.indexOf('Autres');
    if (autresIdx !== -1) {
      displayHeaders = headers.filter((_, i) => i !== autresIdx);
      displayData = displayData.map(row => row.filter((_, i) => i !== autresIdx));
    }
  }

  const totalsRow = [
    'TOTALS',
    '',
    formatNumber(totals['PAX HT']),
    formatNumber(totals['VEH HT']),
    formatNumber(totals['Cabin']),
    formatNumber(totals['Lit']),
    formatNumber(totals['Fauteuil']),
    formatNumber(totals['Animaux']),
    ...(removeAutres ? [] : [formatNumber(totals['Autres'])]),
    formatNumber(totals['Carb.Veh']),
    formatNumber(totals['Carb.Other']),
    formatNumber(totals['Frais PAX']),
    formatNumber(totals['Frais Haut.']),
    formatNumber(totals['Frais Mod.']),
    formatNumber(totals['TTC']),
    options.invoiceDetails.currency,
    formatNumber(totals['Commission']),
  ];

  const colCount = displayHeaders.length;
  const colWidth = (pageWidth - 2 * margin) / colCount;
  const rowHeight = 5;

  yPos = 48;

  const drawCell = (x: number, y: number, width: number, height: number, text: string, isBgGrey: boolean) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);

    if (isBgGrey) {
      pdf.setFillColor(200, 200, 200);
    } else {
      pdf.setFillColor(255, 255, 255);
    }

    pdf.rect(x, y, width, height, 'FD');

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(6.5);
    pdf.text(text, x + width / 2, y + height / 2 + 0.8, {
      align: 'center',
      maxWidth: width - 1,
    });
  };

  const drawRow = (row: string[], isBgGrey: boolean = false) => {
    if (yPos + rowHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }

    for (let i = 0; i < row.length; i++) {
      const xPos = margin + i * colWidth;
      drawCell(xPos, yPos, colWidth, rowHeight, row[i], isBgGrey);
    }
    yPos += rowHeight;
  };

  // Draw table
  pdf.setFont('helvetica', 'bold');
  drawRow(displayHeaders, true);

  pdf.setFont('helvetica', 'normal');
  for (const row of displayData) {
    drawRow(row, false);
  }

  pdf.setFont('helvetica', 'bold');
  drawRow(totalsRow, true);

  return pdf.output('blob') as Blob;
}
