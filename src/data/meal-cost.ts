// Cost breakdown for the gym's signature chicken-rice-salad meal.
// Visible to managers only (rendered on /finance/store).
//
// To re-anchor pricing later: edit this file. The portal's order-meal
// page reads only the customer-facing price (29,000 SYP) — the cost
// breakdown stays internal.

export interface MealCostLine {
  label_ar: string;
  amount_syp: number;
}

export const MEAL_COST_BREAKDOWN: MealCostLine[] = [
  { label_ar: "أجور دجاج ١٠٠ غ",         amount_syp: 4_800 },
  { label_ar: "أجور رز ١٠٠ غ (قبل الطبخ)", amount_syp: 2_500 },
  { label_ar: "سلطة ٢٠٠ غ (خيار، خس، بندورة، زيتون أسود، ذرة، دبس رمان)", amount_syp: 2_000 },
];

export const MEAL_COST_PACKAGING_SYP = 2_300;

// Profit + operating + gas + diet sauces (lump sum, see edits.txt).
// Set so that the final customer price lands at 29,000 ل.س.
export const MEAL_COST_OVERHEAD_SYP =
  29_000
    - MEAL_COST_BREAKDOWN.reduce((s, l) => s + l.amount_syp, 0)
    - MEAL_COST_PACKAGING_SYP;

export const MEAL_RETAIL_PRICE_SYP = 29_000;

export const MEAL_GUARANTEES_AR = [
  "٢٨٥ غ رز بعد الطبخ",
  "١٥٠ غ دجاج بعد الطبخ",
];
