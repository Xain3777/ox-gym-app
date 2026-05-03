// ═══════════════════════════════════════════════════════════════
// OX GYM — MEAL OPTIONS (kitchen pricing source of truth)
//
// Visibility contract:
//   • Client / portal:   name, portions, includesSalad, sellPriceSyp
//   • Manager / finance: + costSyp + profit
// Never render costSyp / profit on a client surface.
//
// Costs are derived from the base meal + per-50g extras via the
// calculateMealCostSyp helper. Sell prices are set independently and
// edited here when the manager re-prices.
// ═══════════════════════════════════════════════════════════════

// ── Base meal (٢٥٠غ رز + ١٥٠غ دجاج + سلطة) ───────────────────
export const BASE_COST_SYP      = 29_000;
export const BASE_RICE_GRAMS    = 250;
export const BASE_CHICKEN_GRAMS = 150;

// ── Per-50g extras above the base portions ──────────────────
export const RICE_EXTRA_COST_PER_50G_SYP    = 425;    // → 850 SYP per 100g rice
export const CHICKEN_EXTRA_COST_PER_50G_SYP = 3_200;  // chicken is the expensive part

/**
 * SYP cost for a chicken-rice-salad meal at the given portion sizes.
 * Cost climbs in 50g rice / 50g chicken increments above the base
 * meal. Salad is bundled into the base cost so includesSalad does not
 * affect this calculation.
 */
export function calculateMealCostSyp(
  riceGrams: number,
  chickenGrams: number,
): number {
  const extraRiceGrams    = Math.max(0, riceGrams    - BASE_RICE_GRAMS);
  const extraChickenGrams = Math.max(0, chickenGrams - BASE_CHICKEN_GRAMS);

  const riceExtraCost    = (extraRiceGrams    / 50) * RICE_EXTRA_COST_PER_50G_SYP;
  const chickenExtraCost = (extraChickenGrams / 50) * CHICKEN_EXTRA_COST_PER_50G_SYP;

  return BASE_COST_SYP + riceExtraCost + chickenExtraCost;
}

// ── Meal option ──────────────────────────────────────────────
export interface MealOption {
  id:            string;
  nameAr:        string;
  riceGrams:     number;
  chickenGrams:  number;
  includesSalad: boolean;
  /** Manager-only. Computed via calculateMealCostSyp; never render in client UI. */
  costSyp:       number;
  /** Shown to clients. Set independently of cost — editable here. */
  sellPriceSyp:  number;
}

export const MEAL_OPTIONS: readonly MealOption[] = [
  {
    id: "meal_250_150",
    nameAr: "وجبة رز ودجاج",
    riceGrams: 250,
    chickenGrams: 150,
    includesSalad: true,
    costSyp: calculateMealCostSyp(250, 150),  // 29,000
    sellPriceSyp: 38_000,
  },
  {
    id: "meal_300_200",
    nameAr: "وجبة رز ودجاج",
    riceGrams: 300,
    chickenGrams: 200,
    includesSalad: true,
    costSyp: calculateMealCostSyp(300, 200),  // 32,625
    sellPriceSyp: 42_000,
  },
];

/** Manager-only profit derivation. */
export function mealProfitSyp(meal: MealOption): number {
  return meal.sellPriceSyp - meal.costSyp;
}

/** Localized portion summary, e.g. "٢٥٠غ رز + ١٥٠غ دجاج + سلطة". */
export function mealPortionSummaryAr(meal: MealOption): string {
  const parts = [
    `${meal.riceGrams.toLocaleString("ar-SY")}غ رز`,
    `${meal.chickenGrams.toLocaleString("ar-SY")}غ دجاج`,
  ];
  if (meal.includesSalad) parts.push("سلطة");
  return parts.join(" + ");
}

/** Localized SYP price formatter — keep formatting consistent across pages. */
export function formatSyp(amount: number): string {
  return `${amount.toLocaleString("ar-SY")} ل.س`;
}
