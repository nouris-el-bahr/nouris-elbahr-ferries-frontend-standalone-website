# PDF Invoice Implementation

## Overview
Added PDF invoice report generation to the sales report pipeline, based on the Python script's `generate_invoice_pdf.py` logic.

---

## Implementation Details

### 1. New PDF Generator Module (`src/lib/engine/pdfGenerator.ts`)

**Features:**
- Generates landscape-oriented PDF reports
- Extracts and maps booking data to invoice display format
- Creates professional table layout with headers, data rows, and totals
- Automatically removes "Autres" column if all values are zero
- Supports multi-booking aggregation with running totals

**Key Functions:**
- `generateInvoicePDF(options)` - Main function that returns Buffer
- `extractRowValues(row)` - Maps raw row data to display values
- `formatNumber(value)` - Formats numbers to 2 decimal places
- `drawTable(doc, rows, x, y)` - Draws table with borders and styling

### 2. PDF Integration into Sales Engine

**Updated Files:**
- `src/lib/engine/salesEngine.ts`
  - Imported `generateInvoicePDF`
  - Updated `SalesRunResult` interface with PDF fields
  - Added PDF generation logic in `runSales` function
  - Passes short report data to PDF generator

**New Fields in SalesRunResult:**
```typescript
salesInvoicePdfBlob: Blob | null;      // PDF document
salesInvoicePdfName: string;           // Generated filename
```

### 3. PDF Generation Logic

```typescript
// Invoice Details
- Invoice Number: Date-based (YYYYMMDD00001)
- Invoice Date: Download date
- Due Date: Download date + 15 days
- Currency: From first booking record

// Company Info
- Name: "Nouris Ferries"
- Agent Code: From booking data
- GSA: From booking data

// Report Data
- All short report records included
- Totals calculated per column
- "Autres" column removed if all zeros
```

### 4. Sales Page Integration

**Updated:** `src/app/(dashboard)/sales/page.tsx`
- Added PDF to conditional report results display
- PDF shows in report results alongside other files
- Uses same download trigger mechanism

---

## PDF Table Structure

### Headers:
```
Code Rés. | Date Créa. | PAX HT | VEH HT | Cabin | Lit | Fauteuil | 
Animaux | Autres | Carb.Veh | Carb.Other | Frais PAX | Frais Haut. | 
Frais Mod. | TTC | Devise | Commission
```

### Data Rows:
- One row per booking from short report
- All amounts formatted to 2 decimal places
- Aligned center with borders

### Totals Row:
- "TOTALS" label in first column
- Sum of each numeric column
- Bold font and grey background
- Currency displayed in Devise column

### Automatic Features:
- Conditional column removal (Autres)
- Dynamic column count and styling
- Landscape orientation for better readability
- Professional formatting with borders and alignment

---

## Dependencies

**New Package:**
- `pdfkit` - PDF document generation
- `@types/pdfkit` - TypeScript definitions

**Installation:**
```bash
npm install pdfkit @types/pdfkit
```

---

## Data Flow

```
Sales Report Generation
        ↓
Extract booking data → shortResults
        ↓
Generate PDF
  ├─ Extract row values
  ├─ Calculate totals
  ├─ Remove empty columns
  ├─ Draw table
  └─ Return PDF Buffer
        ↓
Convert to Blob
        ↓
Add to SalesRunResult
        ↓
Display in Report Results
        ↓
Download as "SalesInvoice_[date].pdf"
```

---

## Configuration Mapping

| Python Script | TypeScript | Source |
|---|---|---|
| `Code réservation` | `Code reservation` | Short report |
| `Montant HT Passagers` | `Montant HT Passagers` | Extracted value |
| `Montant HT Véhicule` | `Montant HT Véhicule` | Extracted value |
| `Montant HT Installation Cabin` | `Montant HT Installation Cabin` | Extracted value |
| `Montant HT Installation Lit` | `Montant HT Installation Lit` | Extracted value |
| `Montant HT Installation Fauteuil` | `Montant HT Installation Fauteuil` | Extracted value |
| `Montant HT Animaux et extra` | `Montant HT Animaux et extra` | Extracted value |
| `Montant HT Autres` | `Montant HT Autres` | Extracted value |
| `Frais carburant véhicule` | `Frais carburant vehicule` | Extracted value |
| `Frais carburant` | `Frais carburant` | Extracted value |
| `Frais passagers` | `Frais passagers` | Extracted value |
| `Frais hauteur` | `Frais hauteur` | Extracted value |
| `Frais modification` | `Frais modification` | Extracted value |
| `Montant TTC` | `Montant TTC` | Extracted value |
| `Commission calculer agent` | `Commission calculer agent` | Extracted value |

---

## Error Handling

- PDF generation wrapped in try-catch
- If PDF generation fails, continues without PDF (non-blocking)
- Graceful degradation: other reports still generated
- Console error logged for debugging

---

## Features

✅ Landscape orientation for better readability
✅ Professional table formatting with borders
✅ Header row styling (bold, grey background)
✅ Totals row styling (bold, grey background)
✅ Dynamic column removal (Autres if all zeros)
✅ Number formatting (2 decimal places)
✅ Center-aligned cells
✅ Automatic totals calculation
✅ Multi-booking aggregation
✅ Company/invoice information header

---

## Testing Checklist

- [ ] Build completes without errors
- [ ] PDF generates successfully for short reports
- [ ] PDF includes all booking records
- [ ] Totals calculated correctly
- [ ] "Autres" column removed when all zeros
- [ ] Table layout renders correctly
- [ ] Numbers formatted to 2 decimals
- [ ] PDF downloads with correct filename
- [ ] PDF includes company/invoice info
- [ ] Error handling works (graceful fallback)

