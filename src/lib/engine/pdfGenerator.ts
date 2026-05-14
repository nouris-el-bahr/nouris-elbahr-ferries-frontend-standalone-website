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
  return {
    'Code réservation': row['Code reservation'] || '',
    'Date création': row['Date creation'] || '',
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
  try {
    const { jsPDF } = await import('jspdf');

    const headers = [
      'Code Rés.', 'Date Créa.', 'PAX HT', 'VEH HT', 'Cabin',
      'Lit', 'Fauteuil', 'Animaux', 'Autres', 'Carb.Veh', 'Carb.Other',
      'Frais PAX', 'Frais Haut.', 'Frais Mod.', 'TTC', 'Devise', 'Commission'
    ];

    const autresValues: number[] = [];
    const tableData: (string | number)[][] = [];
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

    const pdf = new jsPDF({
      orientation: 'l',
      unit: 'mm',
      format: 'letter',
    });

    let yPosition = 15;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Agent Invoice', 15, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Invoice No: ${options.invoiceDetails.invoiceNumber}`, 15, yPosition);
    yPosition += 5;
    pdf.text(`Invoice Date: ${options.invoiceDetails.invoiceDate}`, 15, yPosition);
    yPosition += 5;
    pdf.text(`Due Date: ${options.invoiceDetails.dueDate}`, 15, yPosition);
    yPosition += 5;
    pdf.text(`Currency: ${options.invoiceDetails.currency}`, 15, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Billed To:', 15, yPosition);
    yPosition += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Agent Code: ${options.companyInfo.agentCode}`, 15, yPosition);
    yPosition += 4;
    pdf.text(`Agent Name: ${options.companyInfo.name}`, 15, yPosition);
    yPosition += 4;
    pdf.text(`GSA: ${options.companyInfo.gsa}`, 15, yPosition);
    yPosition += 8;

    (pdf as any).autoTable({
      head: [displayHeaders],
      body: displayData,
      foot: [totalsRow],
      startY: yPosition,
      margin: 15,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [204, 204, 204],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
      },
      footStyles: {
        fillColor: [204, 204, 204],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
      },
      didDrawPage: () => {
        // Empty - just to use the autoTable plugin
      },
    });

    const pdfBlob = pdf.output('blob') as Blob;
    return pdfBlob;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
}
