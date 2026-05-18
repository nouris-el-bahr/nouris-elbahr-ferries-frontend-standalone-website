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

interface GSACompanyInfo {
  name: string;
  address?: string;
  email?: string;
  website?: string;
  companyLegal?: string;
}

interface PDFGeneratorOptions {
  companyInfo: CompanyInfo;
  invoiceDetails: InvoiceDetails;
  bookingsData: Row[];
  invoiceType?: 'GSA' | 'Agence';
  issuingCompany?: GSACompanyInfo;
  logoPath?: string;
  stampPath?: string;
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
  'Frais annulation': number;
  'Montant TTC': number;
  'Commission calculer agent': number;
}

function formatNumber(value: number): string {
  // Format number with spaces as thousand separators and 2 decimal places
  const roundedValue = Math.round(value * 100) / 100;
  const parts = roundedValue.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add space as thousand separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return `${formattedInteger}.${decimalPart}`;
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
    'Frais annulation': Number(row['Frais annulation'] || 0),
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

  // Load and add logo (left corner) - preserve aspect ratio
  let logoWidth = 15;
  let logoHeight = 15;
  const logoPath = options.logoPath || '/logo_zaatcha.png';
  try {
    const logoResponse = await fetch(logoPath);
    const logoBlob = await logoResponse.blob();
    const logoUrl = URL.createObjectURL(logoBlob);

    // Get image dimensions to preserve aspect ratio
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load logo'));
      image.src = logoUrl;
    });

    const aspectRatio = img.width / img.height;
    logoHeight = options.invoiceType === 'GSA' ? 30 : 20;
    logoWidth = logoHeight * aspectRatio;

    pdf.addImage(logoUrl, 'PNG', margin, 8, logoWidth, logoHeight);
  } catch (error) {
    console.warn(`Logo not found: ${logoPath}`);
  }

  // Draw top right decorative bands extending to 1/3 of page width
  const bandWidth = (pageWidth / 2);
  const bandHeight = 4;
  const bandStartX = pageWidth - bandWidth;
  const bandColor = [31, 41, 102];

  pdf.setFillColor(bandColor[0], bandColor[1], bandColor[2]);
  const drawLeftRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    pdf.rect(x + r, y, w - r, h, 'F');
    pdf.ellipse(x + r, y + r, r, r, 'F');
    pdf.ellipse(x + r, y + h - r, r, r, 'F');
  };

  drawLeftRoundedRect(bandStartX, 8, bandWidth, bandHeight, 1.5);
  drawLeftRoundedRect(bandStartX, 14, bandWidth, bandHeight, 1.5);
  drawLeftRoundedRect(bandStartX, 20, bandWidth, bandHeight, 1.5);

  // Load and add stamp (centered below bands)
  const stampPath = options.stampPath || '/stamp_zaatcha.png';
  try {
    const stampResponse = await fetch(stampPath);
    const stampBlob = await stampResponse.blob();
    const stampUrl = URL.createObjectURL(stampBlob);
    const stampWidth = 41.6;
    const stampHeight = 40;
    const stampX = pageWidth / 2;
    const stampY = 27;
    pdf.addImage(stampUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);
  } catch (error) {
    console.warn(`Stamp not found: ${stampPath}`);
  }

  // Left column: Invoice title with logo
  let yPos = 12;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Facture Agent', margin + logoWidth + 5, yPos);
  yPos += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Facture No: ${options.invoiceDetails.invoiceNumber}`, margin + logoWidth + 5, yPos);
  yPos += 4;
  pdf.text(`Date de Facture: ${options.invoiceDetails.invoiceDate}`, margin + logoWidth + 5, yPos);
  yPos += 4;
  pdf.text(`Date d'Échéance: ${options.invoiceDetails.dueDate}`, margin + logoWidth + 5, yPos);
  yPos += 4;
  pdf.text(`Devise: ${options.invoiceDetails.currency}`, margin + logoWidth + 5, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Facturé à:', margin + logoWidth + 5, yPos);
  yPos += 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Code Agent: ${options.companyInfo.agentCode}`, margin + logoWidth + 5, yPos);
  yPos += 4;
  pdf.text(`Nom de l'Agent: ${options.companyInfo.name}`, margin + logoWidth + 5, yPos);
  yPos += 4;
  pdf.text(`GSA: ${options.companyInfo.gsa}`, margin + logoWidth + 5, yPos);

  // Right column: Company info (right of stamp)
  const rightColX = pageWidth / 2 + 45;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');

  const companyName = options.issuingCompany?.name || 'Zaatcha Voyages Kouba';
  pdf.text(companyName, rightColX, 40, { align: 'left' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const companyInfoLines = [];

  if (options.issuingCompany) {
    if (options.issuingCompany.companyLegal) {
      companyInfoLines.push(options.issuingCompany.companyLegal);
    }
    if (options.issuingCompany.address) {
      companyInfoLines.push(options.issuingCompany.address);
    }
    if (options.issuingCompany.email) {
      companyInfoLines.push(options.issuingCompany.email);
    }
    if (options.issuingCompany.website) {
      companyInfoLines.push(options.issuingCompany.website);
    }
  } else {
    companyInfoLines.push(
      'Coop les communaux Villa N 40, Kouba, Algiers -ALGERIA-',
      'Contact@Zaatchavoyages.com',
      'www.zaatchavoyages.com'
    );
  }

  let infoY = 45;
  for (const line of companyInfoLines) {
    pdf.text(line, rightColX, infoY, { maxWidth: 80, align: 'left' });
    infoY += 4;
  }

  // Table section
  const headers = [
    'Code Rés.', 'Date Créa.', 'PAX HT', 'VEH HT', 'Cabin',
    'Lit', 'Fauteuil', 'Animaux', 'Autres', 'Carb.Veh', 'Carb',
    'Frais PAX', 'Frais Haut.', 'Frais Mod.', 'Frais Ann.', 'TTC', 'Commission', 'Devise'
  ];

  const autresValues: number[] = [];
  const validTableData: string[][] = [];
  const canceledTableData: string[][] = [];

  const createTotalsObject = () => ({
    'TTC': 0,
    'Commission': 0,
  });

  const validTotals = createTotalsObject();
  const canceledTotals = createTotalsObject();

  for (const row of options.bookingsData) {
    const values = extractRowValues(row);
    autresValues.push(values['Montant HT Autres']);

    const statut = (row['Statut reservation'] || '').toUpperCase();
    const isCanceled = statut === 'CAN';

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
      formatNumber(values['Frais annulation']),
      formatNumber(values['Montant TTC']),
      formatNumber(values['Commission calculer agent']),
      row['Devise'] || options.invoiceDetails.currency,
    ];

    const targetData = isCanceled ? canceledTableData : validTableData;
    const targetTotals = isCanceled ? canceledTotals : validTotals;

    targetData.push(tableRow);

    targetTotals['TTC'] += values['Montant TTC'];
    targetTotals['Commission'] += values['Commission calculer agent'];
  }

  const removeAutres = autresValues.every(v => v === 0);
  let displayHeaders = headers;

  if (removeAutres) {
    const autresIdx = headers.indexOf('Autres');
    if (autresIdx !== -1) {
      displayHeaders = headers.filter((_, i) => i !== autresIdx);
    }
  }

  const createTotalsRow = (totals: Record<string, number>, label: string = 'TOTAUX') => {
    // Create row with empty strings for all cells
    const regularRow = new Array(displayHeaders.length).fill('');
    
    // Find indices for TTC and Commission
    const ttcIndex = displayHeaders.indexOf('TTC');
    const commissionIndex = displayHeaders.indexOf('Commission');
    
    // Find a good position for TOTAUX label (two cells before TTC)
    // Let's put it spanning across two cells: the 'Frais Ann.' column and one column before it
    const indexBeforeTTC = ttcIndex - 1;
    const startSpanIndex = Math.max(0, indexBeforeTTC - 1);
    
    // Set the label at the start of the span
    regularRow[startSpanIndex] = label;
    
    // Set TTC and Commission values
    if (ttcIndex !== -1) {
      regularRow[ttcIndex] = formatNumber(totals['TTC']);
    }
    if (commissionIndex !== -1) {
      regularRow[commissionIndex] = formatNumber(totals['Commission']);
    }
    
    // Return as special object to indicate it should span 2 cells
    return { type: 'spanning', data: regularRow, spanCount: 2, startIndex: startSpanIndex };
  };

  const colCount = displayHeaders.length;
  const baseColWidth = (pageWidth - 2 * margin) / colCount;
  
  // Make TTC and Commission columns 20% bigger, Devise column 30% smaller
  const ttcIndex = displayHeaders.indexOf('TTC');
  const commissionIndex = displayHeaders.indexOf('Commission');
  const deviseIndex = displayHeaders.indexOf('Devise');
  
  // Width adjustments
  const ttcIncrease = baseColWidth * 0.2; // TTC gets 20% wider
  const commissionIncrease = baseColWidth * 0.2; // Commission also gets 20% wider
  const deviseDecrease = baseColWidth * 0.3; // Devise gets 30% narrower
  const totalIncrease = ttcIncrease + commissionIncrease;
  const netChange = totalIncrease + deviseDecrease;
  
  // Count columns that need adjustment
  const widenColumns = [ttcIndex, commissionIndex].filter(idx => idx !== -1);
  const otherColumnsCount = colCount - widenColumns.length - (deviseIndex !== -1 ? 1 : 0);
  
  const getColWidth = (index: number): number => {
    if (index === ttcIndex) {
      return baseColWidth + ttcIncrease;
    }
    if (index === commissionIndex) {
      return baseColWidth + commissionIncrease;
    }
    if (index === deviseIndex) {
      return baseColWidth - deviseDecrease;
    }
    // For other columns, slightly adjust to maintain total width
    if (otherColumnsCount > 0) {
      return baseColWidth - (netChange / otherColumnsCount);
    }
    return baseColWidth;
  };

  const getColX = (index: number): number => {
    let x = margin;
    for (let i = 0; i < index; i++) {
      x += getColWidth(i);
    }
    return x;
  };

  const rowHeight = 5;

  // Start table section after company info
  yPos = 70;

  const shouldAlignRight = (header: string): boolean => {
    const centerAlignHeaders = ['Code Rés.', 'Date Créa.', 'Devise'];
    return !centerAlignHeaders.includes(header);
  };

  const drawCell = (
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    isBgGrey: boolean,
    align: 'left' | 'center' | 'right' = 'center'
  ) => {
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

    let textX = x + width / 2;
    if (align === 'right') {
      textX = x + width - 0.5;
    } else if (align === 'left') {
      textX = x + 0.5;
    }

    pdf.text(text, textX, y + height / 2 + 0.8, {
      align: align,
      maxWidth: width - 1,
    });
  };

  const drawRow = (row: any, isBgGrey: boolean = false) => {
    if (yPos + rowHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      // Redraw headers on new page if needed
      pdf.setFont('helvetica', 'bold');
      drawRow(displayHeaders, true);
      pdf.setFont('helvetica', 'normal');
    }

    const boldColumns = ['Code Rés.', 'Date Créa.', 'Devise', 'TTC', 'Commission'];
    
    // Check if this is a spanning row
    const isSpanningRow = row.type === 'spanning';
    const rowData = isSpanningRow ? row.data : row;
    const spanCount = isSpanningRow ? row.spanCount : 1;
    const startSpanIndex = isSpanningRow ? (row.startIndex || 0) : 0;

    for (let i = 0; i < rowData.length; i++) {
      // Handle spanning for the TOTAUX label at the specified start index
      if (isSpanningRow && i === startSpanIndex && rowData[i] !== '') {
        // Calculate combined width of the cells to span
        let combinedWidth = 0;
        for (let j = 0; j < spanCount; j++) {
          combinedWidth += getColWidth(startSpanIndex + j);
        }
        
        const xPos = getColX(startSpanIndex);
        
        // Draw single cell spanning multiple columns
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        
        if (isBgGrey) {
          pdf.setFillColor(200, 200, 200);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        
        pdf.rect(xPos, yPos, combinedWidth, rowHeight, 'FD');
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(6.5);
        
        // Center the text in the spanned cell
        pdf.text(rowData[i], xPos + combinedWidth / 2, yPos + rowHeight / 2 + 0.8, {
          align: 'center',
          maxWidth: combinedWidth - 1,
        });
        
        // Skip the next (spanCount - 1) cells since they're merged into this one
        i += spanCount - 1;
        continue;
      }
      
      // Skip rendering if this cell is part of the spanned area (not the first cell)
      if (isSpanningRow && i > startSpanIndex && i < startSpanIndex + spanCount) {
        continue;
      }
      
      // Skip rendering empty cells in spanning row
      if (isSpanningRow && rowData[i] === '') {
        continue;
      }
      
      // For normal cells (including TTC and Commission), render normally
      let xPos = getColX(i);
      let colWidth = getColWidth(i);
      
      // Normal cell rendering
      let align: 'left' | 'center' | 'right' = 'center';
      if (!isBgGrey) {
        align = shouldAlignRight(displayHeaders[i]) ? 'right' : 'center';
      }

      const isBoldColumn = boldColumns.includes(displayHeaders[i]);
      if (!isBgGrey && isBoldColumn) {
        pdf.setFont('helvetica', 'bold');
      }
      drawCell(xPos, yPos, colWidth, rowHeight, rowData[i], isBgGrey, align);
      if (!isBgGrey && isBoldColumn) {
        pdf.setFont('helvetica', 'normal');
      }
    }
    yPos += rowHeight;
  };

  const drawSection = (sectionData: string[][], sectionTotals: Record<string, number>, sectionTitle: string, isFirstSection: boolean = true) => {
    if (sectionData.length === 0) return;

    // Add spacing before section (except for first section)
    if (!isFirstSection) {
      yPos += 8; // Add space between sections
      
      // Check if we need a new page for the next section
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }
    }

    // Draw section title
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(sectionTitle, margin, yPos);
    yPos += 6; // Space after title

    // Prepare display data (remove Autres column if needed)
    const displayData = removeAutres
      ? sectionData.map(row => row.filter((_, i) => headers[i] !== 'Autres'))
      : sectionData;

    // Draw header row
    pdf.setFont('helvetica', 'bold');
    drawRow(displayHeaders, true);

    // Draw data rows
    pdf.setFont('helvetica', 'normal');
    for (const row of displayData) {
      drawRow(row, false);
    }

    // Draw totals row
    pdf.setFont('helvetica', 'bold');
    const totalsRow = createTotalsRow(sectionTotals, 'TOTAUX');
    drawRow(totalsRow, true);
    
    // Add a small space after the totals row
    yPos += 2;
  };

  // Draw valid reservations section (first section)
  drawSection(validTableData, validTotals, 'Réservations Valides', true);

  // Draw canceled reservations section (second section with spacing)
  drawSection(canceledTableData, canceledTotals, 'Réservations Annulées', false);

  return pdf.output('blob') as Blob;
}