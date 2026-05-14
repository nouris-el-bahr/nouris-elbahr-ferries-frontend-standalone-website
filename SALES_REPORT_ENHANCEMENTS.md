# Sales Report Generation Enhancements

## Overview
Implementation of Python script features into TypeScript/Next.js sales report generation:
- HT (ex-tax) breakdown by category type
- Passenger & vehicle count tracking
- Optional split-by-departure report generation (6th report)

---

## Changes Made

### 1. Sales Engine (`src/lib/engine/salesEngine.ts`)

#### A. Configuration Interface Updates
```typescript
export interface SalesConfig {
  downloadDate: string;
  vatSuffix: string;
  format: string;
  mode: 'short' | 'detailed';
  onlyCheckedIn: boolean;
  splitByDeparture?: boolean;  // NEW: Optional 6th report generation
}
```

#### B. Result Interface Updates
```typescript
export interface SalesRunResult {
  // ... existing fields ...
  salesSplitByDepartureBlob: Blob | null;      // NEW: 6th report blob
  salesSplitByDepartureName: string;           // NEW: 6th report filename
}
```

#### C. Passenger & Vehicle Count Calculations
New fields added to `extractBookingData`:
- `countP`: Passengers (Category Group Code = 'P')
- `countPRih`: RIH Passengers (Category Group Code = 'PR')
- `countVt`: Tourist Vehicles (V excluding CARL)
- `countVc`: Commercial Vehicles (CARM, CARH)
- `countVa`: Other Vehicles (excluding CARL, CARM, CARH)

#### D. HT Breakdown by Category Type
```typescript
const htP = round2((amountsByGroup['P'] || 0) + (amountsByGroup['PR'] || 0));
const htV = round2(amountsByGroup['V'] || 0);
const htI = round2((amountsByGroup['L'] || 0) + (amountsByGroup['S'] || 0));
const htA = round2(amountsByGroup['K9'] || 0);
const htX = round2(ht - htP - htA - htV - htI);
```

#### E. Short Result Enhancement
New fields in `shortResult`:
```typescript
'Nombre passagers': countP,
'Nombre passagers RIH': countPRih,
'Nombre véhicules touristique': countVt,
'Nombre véhicules commercial': countVc,
"Nombre d'autre véhicules": countVa,
'Montant HT Passagers': htP,
'Montant HT Véhicule': htV,
'Montant HT Installation': htI,
'Montant HT Animaux et extra': htA,
'Montant HT Autres': htX,
```

#### F. Split by Departure Report
New function `generateSplitByDepartureReport`:
- Transforms aller/retour pairs into separate rows
- Each departure becomes a distinct record
- Uses single departure fields instead of split:
  - "Code depart" (instead of Code depart aller/retour)
  - "Check-in" (instead of Check-in aller/retour)
- Preserves all other fields (counts, HT breakdown, commissions, etc.)

#### G. Report Generation Pipeline
Updated `runSales` function:
- Calls `generateSplitByDepartureReport` when `config.splitByDeparture` is true
- Generates 6th report: `SalesByDeparture.xlsx`
- Returns new fields in `SalesRunResult`

### 2. Redux Store (`src/store/slices/salesSlice.ts`)

#### A. State Interface
```typescript
interface SalesState {
  // ... existing fields ...
  splitByDeparture: boolean;  // NEW: Track 6th report option
}
```

#### B. Initial State
```typescript
const initialState: SalesState = {
  // ... existing fields ...
  splitByDeparture: false,
};
```

#### C. Reducer Actions
```typescript
setSplitByDeparture(state, action: PayloadAction<boolean>) {
  state.splitByDeparture = action.payload;
}
```

### 3. Sales Page (`src/app/(dashboard)/sales/page.tsx`)

#### A. Configuration Update
```typescript
const config = {
  downloadDate: sales.downloadDate,
  vatSuffix: sales.vatSuffix,
  format: sales.format as "Csv" | "Xlsx",
  mode: sales.mode as "short" | "detailed",
  onlyCheckedIn: sales.onlyCheckedIn,
  splitByDeparture: sales.splitByDeparture,  // NEW
};
```

#### B. Result Handling
Added 6th report to conditional rendering:
```typescript
...(result.salesSplitByDepartureBlob
  ? [
      {
        name: result.salesSplitByDepartureName,
        blob: result.salesSplitByDepartureBlob,
      },
    ]
  : []),
```

### 4. Sales Report Form (`src/features/reports/components/SalesReportForm.tsx`)

#### A. Props Interface
```typescript
interface SalesReportFormProps {
  // ... existing props ...
  splitByDeparture?: boolean;           // NEW
  onSplitByDepartureChange?: (checked: boolean) => void;  // NEW
}
```

#### B. Checkbox Control
```typescript
{onSplitByDepartureChange && (
  <Checkbox
    id="splitByDeparture"
    label="Générer rapport par départ"
    checked={splitByDeparture}
    onChange={(e) => onSplitByDepartureChange(e.target.checked)}
  />
)}
```

#### C. Page Integration
Sales page passes state and handlers to form:
```typescript
splitByDeparture={sales.splitByDeparture}
onSplitByDepartureChange={(checked) =>
  dispatch(setSplitByDeparture(checked))
}
```

---

## Report Structure

### Standard Short Report (Excel sheet: "Sales")
**Columns (in order):**
1. Booking metadata (code, status, creator, dates, agent, customer)
2. **Passenger counts** (NEW):
   - Nombre passagers
   - Nombre passagers RIH
   - Nombre véhicules touristique
   - Nombre véhicules commercial
   - Nombre d'autre véhicules
3. Reference & Departure info
4. **HT Breakdown** (NEW):
   - Montant HT Passagers
   - Montant HT Véhicule
   - Montant HT Installation
   - Montant HT Animaux et extra
   - Montant HT Autres
5. Fee breakdown (existing structure)
6. Totals, balance, commissions, flags

### Split by Departure Report (Excel sheet: "ByDeparture")
**Generated when:** `splitByDeparture: true`
**Logic:**
- One row per departure in booking
- Single "Code depart" field (vs. aller/retour split)
- Single "Check-in" field (vs. aller/retour split)
- All other fields identical to short report
- Booking with 1 departure = 1 row
- Booking with 2 departures = 2 rows

**Example:**
```
Original Short Report:
| Code reservation | Code depart aller | Check-in aller | Code depart retour | Check-in retour |
| BK001            | ALG               | true           | MAR                | false           |

Split by Departure Report:
| Code reservation | Code depart | Check-in |
| BK001            | ALG         | true     |
| BK001            | MAR         | false    |
```

---

## Testing Checklist

- [x] TypeScript compilation (no errors)
- [ ] Sales report generation with new fields
- [ ] Split by departure report generation
- [ ] Verify passenger/vehicle counts calculation
- [ ] Verify HT breakdown calculation
- [ ] Verify all 6 reports download when splitByDeparture enabled
- [ ] Verify only 5 reports when splitByDeparture disabled
- [ ] Check field formatting and rounding
- [ ] Verify detailed report includes all aggregations plus new fields

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/lib/engine/salesEngine.ts` | +150 lines: HT breakdown, counts, split report function, config/result updates |
| `src/store/slices/salesSlice.ts` | +4 lines: state, initial value, reducer action, export |
| `src/app/(dashboard)/sales/page.tsx` | +8 lines: import, config, result handling |
| `src/features/reports/components/SalesReportForm.tsx` | +12 lines: props, checkbox, handler integration |

**Total:** ~174 lines added, 0 lines removed

---

## Alignment with Python Script

### Implemented ✅
- HT breakdown by category type (exact same calculation)
- Passenger/vehicle count extraction (exact same logic)
- Short result field structure (matches Python output)
- Split by departure mode (transforms aller/retour to single fields)

### Not Implemented (Architectural Differences)
- Configuration-driven deployment mode (TS always uses aller/retour internally, splits externally)
- Execution tracking/performance logging (TS doesn't have explicit timing)
- Custom VAT suffix handling (TS uses fixed ". Vat" format)

---

## Notes

1. **Split report generation** works by post-processing short results rather than configuring extraction mode. This approach keeps the internal logic unified while providing the desired output.

2. **HT calculations** use identical formula to Python script:
   - `ht = total - (FUEL + SECP + PCONP + PORTP + FUELV + SECV + PCONV + PORTV + TAXH1 + TAXH2 + AMD + CAN)`
   - Breakdown sums equal original HT value: `ht = htP + htV + htI + htA + htX`

3. **Passenger/vehicle counting** filters match Python exactly:
   - countVa excludes CARL, CARM, CARH (not inclusive filter like Python)
   - Note: Python uses `~isin()` (NOT in) while TS uses negative condition - same effect

4. All numeric values rounded to 2 decimal places using `round2()` for consistency.

