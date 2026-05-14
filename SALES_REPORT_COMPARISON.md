# Sales Report Generation: Python vs TypeScript Comparison

## Overview
Both the `minimize_booking_script.py` (Python) and `salesEngine.ts` (TypeScript) process booking data to generate sales reports with short and detailed views. This document compares their approaches, data structures, and logic.

---

## 1. Core Processing Flow

### Python (`extract_data` function)
```
1. Extract general booking info (code, user, agent, customer, dates)
2. Aggregate amounts by Category Code, Category Group Code
3. Aggregate quantities by Category Group Name
4. Calculate financial summary (total, balance, commission)
5. Determine journey split (single departure vs. aller/retour)
6. Calculate HT (ex-tax amount) and commission
7. Build two flat dictionaries: detailed and short results
```

### TypeScript (`extractBookingData` function)
```
1. Extract general booking info (code, user, agent, customer, dates)
2. Aggregate amounts by Category Code, Category Group Code via pivotSum
3. Aggregate quantities by Category Group Name
4. Calculate financial scalars (total, balance, commission)
5. Determine departure split (single vs. aller/retour)
6. Calculate HT and commission
7. Build shortResult dict
8. Create detailedResult by extending shortResult with all aggregations
```

**Similarity**: Both follow the same logical flow and extract the same base data.

---

## 2. Deployment Mode Handling

### Python
```python
if split_by_departure:
    # Single departure mode
    (booking_depart_date, booking_depart_code, booking_journey,
     booking_checking_date, booking_checking_user, booking_checking_status) = (...)
else:
    # Aller/Retour mode (standard)
    (booking_aller_depart_date, booking_aller_depart_code, ...)
    (booking_retour_depart_date, booking_retour_depart_code, ...)
```

**Output**: Two separate result dictionaries depending on mode.

### TypeScript
```typescript
// Always uses aller/retour handling based on departure times
const departTimes = [...new Set(bookingRows.map((r) => r['Departure Time']).filter((t) => t))];
departTimes.sort();

if (departTimes.length === 1) {
    // Single departure - set either aller or retour based on journey code
    if (journeyCodes.includes('ALG') || journeyCodes.includes('ORN')) {
        alCode = ...; alChk = ...;
    }
    if (journeyCodes.includes('MAR') || journeyCodes.includes('ALC')) {
        reCode = ...; reChk = ...;
    }
} else if (departTimes.length >= 2) {
    // Two departures - split between aller and retour
    alCode = alRows[0]['Departure Code'];
    reCode = reRows[0]['Departure Code'];
}
```

**Output**: Always single result with `alCode`, `alChk`, `reCode`, `reChk` fields.

**Difference**: 
- Python has configuration-driven mode switching
- TypeScript only supports aller/retour split (no single-departure mode option)
- TypeScript journey code detection is more flexible (checks contains vs. startswith)

---

## 3. Data Extraction & Aggregation

### Python
```python
# Aggregation for all category types
amounts_by_category_code_aggregate = aggregate_and_sort(
    df=df_booking, index_col="Category Code",
    value_cols=f"Price Excl{vat}", custom_order=custom_category_code_order,
    aggfunc="sum", fill_missing=True, fill_value=0,
)

# Quantities by category group name
quantities_by_category_group_name_aggregate = aggregate_and_sort(
    df=df_booking, index_col="Category Group Name",
    value_cols="Category Quantity", custom_order=custom_category_group_name_order,
    aggfunc="sum", fill_missing=True, fill_value=0,
)
# Remove "Fees" category
if "Fees" in quantities_by_category_group_name_aggregate.index:
    quantities_by_category_group_name_aggregate = quantities_by_category_group_name_aggregate.drop("Fees")
```

### TypeScript
```typescript
const amountsByCode = pivotSum(
    bookingRows,
    'Category Code',
    priceCol,
    CUSTOM_PIVOT_ORDER_CODES,
    true,  // fill_missing
    0      // fill_value
);

const qtyByName = pivotSum(
    withSpec,  // withSpec adds Category Specification Code to name
    'Category Group Name',
    'Category Quantity',
    CUSTOM_PIVOT_ORDER_NAMES,
    false,  // fill_missing = false!
    0       // fill_value
);
```

**Differences**:
- TypeScript uses `withSpec` which appends `Category Specification Code` to names
- TypeScript doesn't explicitly remove "Fees" from quantities
- TypeScript's `qtyByName` uses `fill_missing=false` while Python fills missing

---

## 4. Financial Calculations

### Python
```python
# Identify specific amount codes
amt_fuel_v = amounts_code_dict.get("amt_code_FUELV", 0)
amt_fuel = amounts_code_dict.get("amt_code_FUEL", 0)
amt_sec_p = amounts_code_dict.get("amt_code_SECP", 0)
amt_pcon_p = amounts_code_dict.get("amt_code_PCONP", 0)
amt_port_p = amounts_code_dict.get("amt_code_PORTP", 0)
# ... more category extractions ...

# Calculate HT (exclude all fees, taxes, amendments, cancellations)
ht = total - (amt_fuel + amt_sec_p + amt_pcon_p + amt_port_p + 
              amt_fuel_v + amt_sec_v + amt_pcon_v + amt_port_v + 
              amt_tax_h1 + amt_tax_h2 + amt_amd + amt_can)

# Calculate commission
calculated_commission = round(
    (amt_tax_h1 + amt_tax_h2 + amt_amd + amt_can + ht) * booking_agent_gsa_commission,
    2
)
```

### TypeScript
```typescript
// Direct calculation from amountsByCode dictionary
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

const calculatedCommission = round2(
    ((amountsByCode['TAXH1'] || 0) +
     (amountsByCode['TAXH2'] || 0) +
     (amountsByCode['AMD'] || 0) +
     (amountsByCode['CAN'] || 0) +
     ht) *
    bookingAgentGsaCommission
);
```

**Similarity**: Both follow identical logic. The excluded categories are:
- FUEL, FUELV (fuel)
- SECP, SECV (security passenger/vehicle)
- PCONP, PCONV (consumption passenger/vehicle)
- PORTP, PORTV (port passenger/vehicle)
- TAXH1, TAXH2 (height taxes)
- AMD (amendment)
- CAN (cancellation)

**Difference**: TypeScript uses `||` operator for safer defaults; Python uses `.get()` method.

---

## 5. Passenger & Vehicle Counts

### Python
```python
# Detailed passenger/vehicle counting
count_p = df_booking[(df_booking["Category Group Code"] == "P")]["Category Quantity"].sum()
count_p_rih = df_booking[(df_booking["Category Group Code"] == "PR")]["Category Quantity"].sum()

count_vt = df_booking[
    (df_booking["Category Group Code"] == "V") &
    (~df_booking["Category Code"].isin(["CARL"]))
]["Category Quantity"].sum()

count_vc = df_booking[
    (df_booking["Category Group Code"].isin(["CARM", "CARH"]))
]["Category Quantity"].sum()

count_va = df_booking[
    (~df_booking["Category Code"].isin(["CARL", "CARM", "CARH"]))
]["Category Quantity"].sum()

# Included in short_result:
"Nombre passagers": count_p,
"Nombre passagers RIH": count_p_rih,
"Nombre véhicules": count_vt,  # or split for single departure mode
```

### TypeScript
```typescript
// NO EQUIVALENT - passenger/vehicle counts are NOT extracted in TypeScript
// Only aggregations by category are included in detailedResult
```

**Critical Difference**: 
- **Python extracts and includes detailed passenger/vehicle counts** in both short and detailed results
- **TypeScript does NOT include these counts** - they could be derived from `qty_*` fields in detailed result but aren't explicitly calculated

**Recommendation**: Add passenger/vehicle count extraction to TypeScript if user needs this data in reports.

---

## 6. Short Result Structure

### Python
```python
short_result = {
    "Code reservation": booking_code,
    "Statut reservation": booking_status,
    "Cree par": booking_user,
    "Date creation": booking_creation_date,
    "Code agent": booking_agent_code,
    "Nom agent": booking_agent_name,
    "GSA agent": booking_agent_gsa,
    "GSA commission agent": booking_agent_gsa_commission,
    "Nom client": booking_customer_name,
    "Prenom client": booking_customer_first_name,
    
    # Passenger/Vehicle counts
    "Nombre passagers": count_p,
    "Nombre passagers RIH": count_p_rih,
    "Nombre véhicules": count_v,  # or split: count_vt, count_vc, count_va
    "Reference": booking_ref,
    
    # Departure info
    "Code depart": booking_depart_code,  # (or aller/retour split)
    "Check-in": booking_checking_status,  # (or aller/retour split)
    
    # Currency & Fee breakdown
    "Devise": booking_currency,
    "Montant HT Passagers": ht_p,
    "Montant HT Véhicule": ht_v,
    "Montant HT Installation": ht_i,
    "Montant HT Animaux et extra": ht_a,
    "Montant HT Autres": ht_x,
    
    "Montant Frais carburant vehicule": amt_fuel_v,
    "Montant Frais carburant": amt_fuel,
    "Montant Frais passagers": frais_passagers,  # sum of SEC+PCON+PORT for passengers
    "Montant Frais vehicule": frais_vehicule,    # sum of SEC+PCON+PORT for vehicles
    "Montant Frais hauteur": frais_hauteur,
    "Montant Frais modification": amt_amd,
    "Montant Frais annulation": amt_can,
    
    # Totals & commission
    "Montant HT": ht,
    "Montant TTC": total,
    "Solde restant du": balance,
    "Commission agent": commission,
    "Commission calculer agent": calculated_commission,
    "Commission diff agent": commission_diff,
    
    # Flags
    "Tarif manuel HT": manual_price_without_fees,
    "Tarif manuel Frais": manual_price_fees,
    "Devise incompatible": booking_agent_currency_missmatched,
}
```

### TypeScript
```typescript
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
    
    // NO passenger/vehicle counts
    
    // Departure info (always aller/retour split)
    'Code depart aller': alCode,
    'Check-in aller': alChk,
    'Code depart retour': reCode,
    'Check-in retour': reChk,
    
    // Currency
    Devise: bookingCurrency,
    
    // NO HT breakdown by type (ht_p, ht_v, ht_i, ht_a, ht_x)
    
    // Fee breakdown (direct from amountsByCode)
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
    
    // Totals & commission (same as Python)
    'Montant HT': round2(ht),
    'Montant TTC': round2(total),
    'Solde restant du': balance,
    'Commission agent': round2(commission),
    'Commission calculer agent': calculatedCommission,
    'Commission diff agent': commissionDiff,
    
    // Flags
    'Tarif manuel HT': manualPriceWithoutFees,
    'Tarif manuel Frais': manualPriceFees,
    'Devise incompatible': bookingAgentCurrencyMismatched || false,
};
```

**Key Differences**:
1. **Missing Fields in TypeScript**:
   - Passenger/vehicle counts (Nombre passagers, Nombre passagers RIH, Nombre véhicules, etc.)
   - HT breakdown by category (Montant HT Passagers, Montant HT Véhicule, etc.)
   
2. **Field Name Differences**:
   - Python: `"Montant Frais..."` → TypeScript: `'Frais...'` (dropped "Montant" prefix for many fields)
   - Python: `"Code depart"` → TypeScript: `'Code depart aller'` / `'Code depart retour'`

3. **Mode Differences**:
   - Python can output single departure fields (Code depart, Check-in) OR aller/retour split
   - TypeScript always outputs both aller and retour fields

---

## 7. Detailed Result Structure

### Python
```python
result = {
    # All short_result fields
    ...short_result,
    
    # Plus all aggregations flattened:
    **quantities_dict,      # "qty_Passengers", "qty_Vehicles", etc.
    **amounts_code_dict,    # "amt_code_ADL", "amt_code_CHD", etc.
    **amounts_group_dict,   # "amt_group_P", "amt_group_V", etc.
}
```

### TypeScript
```typescript
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
```

**Similarity**: Both extend short result with all granular amounts and quantities.

---

## 8. Unique Features

### Python Only
1. **Configurable split mode**: Single departure vs. aller/retour handling
2. **Detailed passenger/vehicle counts**:
   - Regular passengers (P)
   - RIH passengers (PR)
   - Tourist vehicles (V, excluding CARL)
   - Commercial vehicles (CARM, CARH)
   - Other vehicles
3. **HT breakdown by category**:
   - ht_p (Passagers)
   - ht_v (Véhicule)
   - ht_i (Installation)
   - ht_a (Animaux et extra)
   - ht_x (Autres)
4. **Execution tracking**: ExecutionTracker with timing, logging, and metadata export
5. **Duplicate category specification handling**: `Category Group Name` is augmented with specification code

### TypeScript Only
1. **Processing integration**: Part of full sales pipeline with invoice control reports, ACD reports
2. **Flexible category filtering**: Via `pivotSum` helper with custom ordering
3. **Implicit detailed report generation**: Optional based on config.mode
4. **Invoice filtering logic**: Test case detection, list detection, direction générale detection
5. **Control report generation**: GSA grouping, balance categorization

---

## 9. Recommendations for TypeScript

To align TypeScript with Python's logic:

### 1. Add Passenger/Vehicle Counts
```typescript
// Extract before building shortResult
const countP = sumBy(
    bookingRows.filter((r) => r['Category Group Code'] === 'P'),
    'Category Quantity'
);
const countPRih = sumBy(
    bookingRows.filter((r) => r['Category Group Code'] === 'PR'),
    'Category Quantity'
);
// ... etc

// Add to shortResult
'Nombre passagers': countP,
'Nombre passagers RIH': countPRih,
```

### 2. Add HT Breakdown by Category
```typescript
// Calculate HT breakdown
const htP = (amountsByGroup['P'] || 0) + (amountsByGroup['PR'] || 0);
const htV = amountsByGroup['V'] || 0;
const htI = amountsByGroup['L'] + amountsByGroup['S']; // Installation
const htA = amountsByGroup['K9'] || 0; // Animals & extras
const htX = ht - htP - htA - htV - htI; // Others

// Add to shortResult
'Montant HT Passagers': round2(htP),
'Montant HT Véhicule': round2(htV),
'Montant HT Installation': round2(htI),
'Montant HT Animaux et extra': round2(htA),
'Montant HT Autres': round2(htX),
```

### 3. Consider Configuration Mode
- Add optional `splitMode: 'single' | 'aller-retour'` parameter (currently only aller-retour)
- Adjust departure field names based on mode

### 4. Fix Category Specification Handling
- Ensure Category Specification Code is properly appended to Category Group Name in aggregations
- Currently only done in `withSpec` for quantities, should apply consistently

### 5. Field Naming Consistency
- Align field names with Python output (e.g., `'Montant Frais...'` vs `'Frais...'`)
- This ensures downstream reports/exports have consistent field names

---

## Summary Table

| Feature | Python | TypeScript | Notes |
|---------|--------|------------|-------|
| Split mode | Configurable (single/aller-retour) | Always aller-retour | Python more flexible |
| Passenger counts | ✓ (detailed breakdown) | ✗ | Missing in TS |
| Vehicle counts | ✓ (detailed breakdown) | ✗ | Missing in TS |
| HT breakdown | ✓ (by category type) | ✗ | Missing in TS |
| Fee breakdown | ✓ | ✓ | Same fields, minor naming differences |
| Commission calc | ✓ | ✓ | Identical logic |
| Aggregations | ✓ | ✓ | Both in detailed result |
| Execution tracking | ✓ | ✗ | Python only (nice-to-have) |
| Invoice filtering | ✗ | ✓ | TypeScript only |
| ACD reports | ✗ | ✓ | TypeScript only |

