# Financial Analysis Dashboard — Profit Calculation Issues & Fix Plan

Status: analysis complete, fix pending business decision (2026-07-08).

## Context

The Financials tab (Board Summary) shows numbers a reader cannot reconcile: Equipment Sales Profit (24,591.57) is not derivable from any pair of displayed cards. Investigation confirmed the arithmetic is internally consistent with the code — the problems are (a) the global discount silently applies to logistics despite a "0% margin pass-through" label, and (b) the cards mix three different bases (with/without discount, with/without import VAT, with/without logistics).

All math lives in `src/App.js`, `calculateProjectCosts()` (lines ~844–1118). Rendered in the Financials tab render block (~L3741–4059).

## How profit is actually calculated

```
voidSalesProfit = equipmentTotalJOD − doorToDoorCostExclTax020JOD        (L1020)

equipmentTotalJOD          = Σ(MSRP + shipping/unit + customs/unit) × (1 − discount)   (L915, L950)
                           = (96,818.13 + 14,396.09) × 0.85 = 94,532.09   ← shown nowhere
doorToDoorCostExclTax020   = dealer + shipping + customs, EXCL import VAT (tax020)     (L892)
                           = 55,544.43 + 7,423.80 + 6,972.29 = 69,940.52  ← shown nowhere
Profit                     = 94,532.09 − 69,940.52 = 24,591.57 ✓
```

Verified against live dashboard (example project): Dealer 55,544.43, Shipping 7,423.80, Customs 6,972.29, Import Tax (tax020) 10,578.66, MSRP list 96,818.13, discount 15%, Final Total 103,665.09 (= 94,532.09 equipment + 5,800 custom + 3,333 services).

## Three different "equipment values" on/off screen

| Value | Meaning | Shown? |
|---|---|---|
| 96,818.13 | MSRP list, no discount, no logistics (`equipmentClientTotalJOD`) | Section B card |
| 82,295.41 | MSRP × 0.85 (`discountedEquipmentValueJOD`) | Section A "Equipment Revenue" |
| 94,532.09 | (MSRP + logistics) × 0.85 = actually billed to client | **Not shown** — profit's revenue base |

## Confirmed defects

1. **Discount eats logistics** (L915/L950): BOQ unit price bundles shipping+customs, 15% discount applies to the whole thing. "Logistics — Pass-through (billed at cost, 0% margin)" label is false: client billed 0.85 × 14,396.09 = 12,236.68 vs cost 14,396.09 → logistics sold 2,159.41 below cost, loss hidden inside equipment profit. True equipment-only profit if pass-through were real: 0.85 × 96,818.13 − 55,544.43 = **26,750.98**.
2. **Import VAT (tax020) inflates cost displays** (L889, L1026): "Internal Landed Cost 80,519.18" includes 10,578.66 recoverable input VAT that profit correctly excludes (real basis 69,940.52). "Logistics Pass-through 24,974.75" also includes it, though client is never billed it (per-unit customs share uses excl-tax020, L896).
3. **Donuts don't sum to totals** (L3837–3866): Revenue Composition slices sum to 116,403 vs Final Total 103,665 (mixes discounted MSRP + undiscounted pass-through incl VAT). "Where Client Money Goes" sums 108,444.
4. **Margin label wrong** (L1029): "profit ÷ MSRP value" divides by *discounted* MSRP (82,295.41 → 29.9%); true MSRP 96,818.13 → 25.4%.
5. **"Effective Discount" is raw input** (L1030): echoes `project.globalDiscount`, not computed vs list.

## Discount basis analysis: what the discount can legitimately touch (2026-07-08)

Verified in `src/App.js` L870–887 and `src/config/constants.js` TAX_RATES: none of the three logistics components depend on the client-facing price, so none should shrink with a client discount.

| Component | Basis in code | Affected by client discount? |
|---|---|---|
| Shipping | `totalWeight × shippingRatePerKg` + fixed clearance/transport/delivery-order fees (L870–874) | **No** — weight + fixed fees |
| Customs duties (tax001 5%, tax215 1%, tax111 0.3%, tax070 5% + fixed tax301/016/019) | `taxableAmount = dealer total + shipping` — the declared import value (L876–887) | **No** — assessed on what we pay Void + freight; client discount never reaches the customs declaration |
| Import VAT tax020 | `(taxableAmount + tax001) × 16%` (L878) | **No** — same import base; recoverable input VAT, already excluded from client pricing |

Only a **dealer-side** discount from Void would move these (lower declared value → lower ad-valorem duties + tax020). The global discount is client-side, so discounting the logistics portion is unambiguously selling below cost.

## Fix (Option A — IMPLEMENTED 2026-07-08, branch `fix/discount-msrp-only`)

**Decision resolved technically: the discount applies to the MSRP component only.**

Per line: `discounted unit price = MSRP × (1 − d) + shippingPerUnit + customsPerUnit`
Aggregate: `equipmentTotalJOD = equipmentClientTotalJOD × (1 − d) + totalShippingCost + totalCustomsExclTax020`

Code changes:
- `src/App.js` equipment total: discount now multiplies `equipmentClientTotalJOD` only; shipping + customs (excl tax020) added at full cost.
- Three discount display rows (project summary PDF, BOQ PDF totals, Financials tab) switched from hardcoded `beforeDiscount × d%` to `calculationResults.discountAmount` (which is now MSRP × d automatically).
- `voidSalesProfit` becomes `discounted MSRP − dealer` (26,750.98 in the example); logistics genuinely 0-margin.
- Client total rises vs old behavior (logistics no longer discounted) — commercial impact, owner sign-off.

### Option A — Recommended: discount MSRP only, logistics truly at cost
- `src/App.js` L950 area: `equipmentTotalJOD = equipmentClientTotalJOD × multiplier + (totalShippingCost + totalCustomsExclTax020)` (or apply discount only to the MSRP component of each unit price so BOQ lines stay consistent).
- Profit becomes `discounted MSRP − dealer` — clean number (26,750.98 in the example); logistics genuinely 0-margin.
- Client total rises slightly (logistics no longer discounted) — pricing change, needs owner sign-off.

### Option B — keep discounting logistics, fix display only
- Keep L1020 profit as-is.
- Relabel logistics box ("discounted with equipment, sold below cost by X").
- Show billed-logistics line and the loss explicitly.

### Display fixes (both options)
- Add "Billed Equipment Total" card (the 94,532.09 figure) so Profit = Billed − Cost Basis reconciles on screen.
- "Internal Landed Cost" card: show excl-import-VAT figure (69,940.52) next to profit, or split VAT out visibly.
- Donut slices: use actually-billed amounts so slices sum to Final Total.
- Margin: either divide by true MSRP or relabel "profit ÷ discounted equipment value".
- Effective Discount: compute `1 − billed/list` or relabel "Global Discount (input)".

## Verification
- Run app (`npm start`), load same project, confirm: cards reconcile (Revenue − Cost = Profit visible on screen), donut slices sum to Final Total, BOQ PDF totals unchanged (Option B) or match new pricing (Option A).
- Check quotation/invoice PDFs + rentals flows that reuse `calculateProjectCosts` outputs (`equipmentTotalJOD`, `projectTotalJOD`) for regressions.
