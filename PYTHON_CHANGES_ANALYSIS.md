# Python Script Changes Analysis & TypeScript Adaptations

## Overview
Analysis of changes made to `minimize_booking_script.py` and corresponding updates to the Next.js TypeScript implementation.

---

## Changes Made to Python Script

### 1. Vehicle Count Logic - count_va

**Before:**
```python
count_va = df_booking[
    (~df_booking["Category Code"].isin(["CARL", "CARM", "CARH"]))
]["Category Quantity"].sum()
```
Excluded specified codes from ALL categories.

**After:**
```python
count_va = df_booking[
    (df_booking["Category Group Code"] == "V") &
    (~df_booking["Category Code"].isin(["CARL", "CARM", "CARH"]))
]["Category Quantity"].sum()
```
Now only counts vehicles (V category) that are NOT CARL, CARM, or CARH.

**Impact:** More precise vehicle counting - excludes non-vehicle items from the "other vehicles" count.

---

### 2. Installation Counts (NEW)

**Added:**
```python
count_c = quantities_dict.get("qty_Cabin", 0)
count_l = quantities_dict.get("qty_Cabin M", 0) + quantities_dict.get("qty_Cabin F", 0)
count_f = quantities_dict.get("qty_Seats", 0)
```

**Mapping:**
- **Cabin (c)**: Direct count from "Cabin" category group name
- **Beds/Lits (l)**: Sum of "Cabin M" (Male) and "Cabin F" (Female) counts
- **Chairs/Fauteuils (f)**: Count from "Seats" category group name

---

### 3. Installation Amount Calculations (NEW)

**Added:**
```python
amt_group_c = df_booking[
    (df_booking["Category Group Name"] == "Cabin")
][f"Price Excl{vat}"].sum()

amt_group_l = df_booking[
    (df_booking["Category Group Name"].isin(["Cabin M","Cabin F"]))
][f"Price Excl{vat}"].sum()
```

**Note:** `amt_group_s` (Seats/Chairs) already existed, reused as `amt_group_f`.

---

### 4. HT Breakdown - Major Restructure

**Before (Single Installation Field):**
```
ht_p (P + PR)
ht_v (V)
ht_i (L + S)        ← Installation (Lits + Seats)
ht_a (K9)
ht_x (remainder)
```

**After (Three Installation Fields):**
```
ht_p (P + PR)       ← Passengers
ht_v (V)            ← Vehicles
ht_c (Cabin)        ← Installation: Cabin (NEW)
ht_l (Cabin M+F)    ← Installation: Beds/Lits (NEW)
ht_f (S)            ← Installation: Chairs/Fauteuils (NEW)
ht_a (K9)           ← Animals & Extras
ht_x (remainder)    ← Others
```

**Calculation Details:**
```python
ht_c = amt_group_c                    # Cabin category amounts
ht_l = amt_group_l                    # Cabin M + Cabin F amounts
ht_f = amt_group_s                    # Seats category amounts
ht_x = ht - ht_p - ht_a - ht_v - ht_i # Changed to account for all 3 new fields
```

**Critical:** The `ht_x` calculation now excludes three separate fields instead of one combined field.

---

## TypeScript Adaptations

### 1. Count Calculations (`extractBookingData`)

```typescript
// Updated count_va logic
const countVa = sumBy(
  bookingRows.filter(
    (r) =>
      r['Category Group Code'] === 'V' &&
      !['CARL', 'CARM', 'CARH'].includes(r['Category Code'])
  ),
  'Category Quantity'
);

// New installation counts
const countC = (qtyByName['Cabin'] || 0);
const countL = ((qtyByName['Cabin M'] || 0) + (qtyByName['Cabin F'] || 0));
const countF = (qtyByName['Seat'] || 0);  // Note: 'Seat' instead of 'Seats'
```

**Note:** Using `qtyByName` from pivotSum which already has category group name aggregations.

### 2. HT Breakdown Calculations

```typescript
// Installation breakdown (Cabin, Beds, Chairs)
const htC = round2(sumBy(
  bookingRows.filter((r) => r['Category Group Name'] === 'Cabin'),
  priceCol
));

const htL = round2(sumBy(
  bookingRows.filter((r) =>
    ['Cabin M', 'Cabin F'].includes(r['Category Group Name'])
  ),
  priceCol
));

const htF = round2(amountsByGroup['S'] || 0);

// Updated remainder calculation
const htX = round2(ht - htP - htV - htC - htL - htF - htA);
```

### 3. Short Report Fields

**Added to shortResult:**
```typescript
'Nombre cabine': countC,
'Nombre lit': countL,
'Nombre fauteuil': countF,
'Montant HT Installation Cabin': htC,
'Montant HT Installation Lit': htL,
'Montant HT Installation Fauteuil': htF,
```

**Removed from shortResult:**
```typescript
'Montant HT Installation': htI,  // Replaced by 3 separate fields above
```

### 4. Split Report Updates

Updated `generateSplitByDepartureReport` to include new fields:
- Counts: Nombre cabine, Nombre lit, Nombre fauteuil
- Amounts: Montant HT Installation Cabin, Montant HT Installation Lit, Montant HT Installation Fauteuil

---

## Field Mapping Reference

| Python Variable | TypeScript Variable | Source | Notes |
|---|---|---|---|
| count_c | countC | qty_Cabin | From qtyByName |
| count_l | countL | qty_Cabin M + qty_Cabin F | From qtyByName |
| count_f | countF | qty_Seat | From qtyByName |
| amt_group_c | htC | Category Group Name == 'Cabin' | Direct sum from rows |
| amt_group_l | htL | Category Group Name in ['Cabin M', 'Cabin F'] | Direct sum from rows |
| amt_group_s | htF | amountsByGroup['S'] | From pivotSum |

---

## Critical Changes Summary

| Aspect | Old | New | Impact |
|---|---|---|---|
| count_va | All categories | V category only | More precise vehicle counting |
| Installation breakdown | 1 field (ht_i) | 3 fields (htC, htL, htF) | Detailed breakdown of installation costs |
| Installation counts | Not tracked | 3 new fields | Visibility into cabin/bed/chair quantities |
| Report columns | +0 | +6 new | 3 counts + 3 HT breakdowns |
| ht_x calculation | ht - ht_p - ht_a - ht_v - ht_i | ht - ht_p - ht_v - ht_c - ht_l - ht_f - ht_a | Accounts for split installation fields |

---

## Testing Checklist

- [ ] Build completes without TypeScript errors
- [ ] count_va filters correctly (V category only)
- [ ] countC, countL, countF populate correctly from data
- [ ] htC, htL, htF calculations match Python script
- [ ] ht_x remainder equals zero (all categories accounted for)
- [ ] Short report includes all 6 new fields
- [ ] Split by departure report includes new fields
- [ ] Detailed report includes all aggregations plus new fields
- [ ] All numeric values properly rounded to 2 decimals

---

## Notes

1. **Category Group Names:** The Python script uses exact string matching for cabin/bed/chair detection. TypeScript does the same via direct row filtering.

2. **Quantity vs Amount Tracking:** 
   - Quantities from `qtyByName` (aggregated by category group name)
   - Amounts recalculated from raw rows to ensure accuracy

3. **Backward Compatibility:** This change removes `ht_i` field but adds 3 replacement fields. Any downstream processing expecting `ht_i` will need updating.

4. **Seat/Seats Discrepancy:** Python uses `qtyByName['Seats']` while TypeScript data might use `'Seat'` - verify with actual data structure.

