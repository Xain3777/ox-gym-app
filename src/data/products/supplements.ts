export interface Product {
  id: number;
  name: string;
  desc: string;
  price: number;
  image: string;
  badge?: string;
  subCategory: string;
}

// Real OX GYM supplements catalog. Edit here.
// Prices are stored on the data model so internal/admin views can still
// see them; the player-facing /portal/shop hides the price column.
export const supplements: Product[] = [
  // ── Whey / Iso ──────────────────────────────────────────────
  { id: 101, name: "Levrone GOLD Whey 2kg",            desc: "واي بروتين Levrone GOLD — عبوة ٢ كغ.",                       price: 47, image: "💪", subCategory: "واي بروتين" },
  { id: 102, name: "Levrone GOLD Iso 2kg",             desc: "بروتين أيزوليت Levrone GOLD — امتصاص سريع، عبوة ٢ كغ.",      price: 57, image: "⚡", subCategory: "واي بروتين" },
  { id: 103, name: "Levrone Whey Supreme 2kg",         desc: "Levrone Whey Supreme — عبوة ٢ كغ.",                         price: 50, image: "💪", subCategory: "واي بروتين" },
  { id: 104, name: "Bad Ass Whey 2kg",                 desc: "Bad Ass Whey — واي بروتين، عبوة ٢ كغ.",                     price: 45, image: "💪", subCategory: "واي بروتين" },
  { id: 105, name: "Bad Ass Anabolic Iso 2kg Vanilla", desc: "Bad Ass Anabolic Iso بنكهة الفانيليا — عبوة ٢ كغ.",         price: 54, image: "🍦", subCategory: "واي بروتين" },

  // ── Mass / Lean Mass / Carbs ────────────────────────────────
  { id: 110, name: "Levrone GOLD Lean Mass 6kg",                  desc: "ماس جينر Levrone GOLD Lean Mass — عبوة ٦ كغ.",         price: 60, image: "🏋️", subCategory: "واي بروتين" },
  { id: 111, name: "Levrone GOLD Lean Mass 3kg Chocolate",         desc: "ماس جينر Levrone GOLD Lean Mass بالشوكولاتة — ٣ كغ.", price: 35, image: "🍫", subCategory: "واي بروتين" },
  { id: 112, name: "Levrone Anabolic Prime Pro 2kg Strawberry",    desc: "Levrone Anabolic Prime Pro بنكهة الفراولة — ٢ كغ.",   price: 55, image: "🍓", subCategory: "واي بروتين" },
  { id: 113, name: "Levrone Anabolic Cream of Rice 2kg",           desc: "كريما الأرز Levrone Anabolic — مصدر كربوهيدرات نظيف، ٢ كغ.", price: 30, image: "🍚", subCategory: "واي بروتين" },

  // ── Creatine ────────────────────────────────────────────────
  { id: 120, name: "Levrone GOLD Creatine 300g (2028)", desc: "كرياتين Levrone GOLD — ٣٠٠ غ، صلاحية ٢٠٢٨.", price: 13, image: "🔬", subCategory: "كرياتين" },
  { id: 121, name: "Levrone GOLD Creatine 300g (2027)", desc: "كرياتين Levrone GOLD — ٣٠٠ غ، صلاحية ٢٠٢٧.", price: 12, image: "🔬", subCategory: "كرياتين" },
  { id: 122, name: "Levrone GOLD Creatine 500g",         desc: "كرياتين Levrone GOLD — عبوة ٥٠٠ غ.",          price: 22, image: "🔬", subCategory: "كرياتين" },
  { id: 123, name: "Levrone GOLD Creatine 1kg",          desc: "كرياتين Levrone GOLD — عبوة ١ كغ.",           price: 32, image: "🔬", subCategory: "كرياتين" },
  { id: 124, name: "Levro Crea 240g",                    desc: "Levro Crea — كرياتين بعبوة ٢٤٠ غ.",            price: 13, image: "🔬", subCategory: "كرياتين" },
  { id: 125, name: "Levrone Anabolic Crea 1kg",          desc: "Levrone Anabolic Creatine — عبوة ١ كغ.",      price: 33, image: "🔬", subCategory: "كرياتين" },

  // ── Amino / EAA / BCAA ──────────────────────────────────────
  { id: 130, name: "Levrone GOLD Amino 350 tabs",                 desc: "أحماض أمينية Levrone GOLD — ٣٥٠ قرص.",                   price: 24, image: "💊", subCategory: "BCAA" },
  { id: 131, name: "Levrone GOLD Beef Amino 600 tabs",            desc: "أحماض أمينية من اللحم البقري — Levrone GOLD، ٦٠٠ قرص.", price: 30, image: "💊", subCategory: "BCAA" },
  { id: 132, name: "Levrone Anabolic Amino 300 tabs",             desc: "Levrone Anabolic Amino — ٣٠٠ قرص.",                       price: 26, image: "💊", subCategory: "BCAA" },
  { id: 133, name: "Levrone Anabolic LEAA9 240g",                  desc: "تسعة أحماض أمينية أساسية — Levrone Anabolic LEAA9، ٢٤٠ غ.", price: 20, image: "🧪", subCategory: "BCAA" },
  { id: 134, name: "Levrone Anabolic EAA+BCAA 1000ml Orange",     desc: "EAA + BCAA سائل بنكهة البرتقال — Levrone Anabolic، ١٠٠٠ مل.", price: 25, image: "🍊", subCategory: "BCAA" },
  { id: 135, name: "Levrone Anabolic Ice BCAA 375g",               desc: "Levrone Anabolic Ice BCAA — ٣٧٥ غ.",                     price: 21, image: "🧊", subCategory: "BCAA" },
  { id: 136, name: "Levrone Anabolic Ice EAA 420g",                desc: "Levrone Anabolic Ice EAA — ٤٢٠ غ.",                      price: 22, image: "🧊", subCategory: "BCAA" },
  { id: 137, name: "Bad Ass BCAA 8:1:1 400g Exotic",                desc: "Bad Ass BCAA بنسبة 8:1:1 بنكهة Exotic — ٤٠٠ غ.",         price: 20, image: "🧪", subCategory: "BCAA" },
  { id: 138, name: "Amino EAA Xplode 520g",                         desc: "Amino EAA Xplode — أحماض أمينية أساسية، ٥٢٠ غ.",          price: 27, image: "🧪", subCategory: "BCAA" },
  { id: 139, name: "Amino Target Xplode 275g Lemon",                desc: "Amino Target Xplode بنكهة الليمون — ٢٧٥ غ.",              price: 19, image: "🍋", subCategory: "BCAA" },

  // ── Pre-workout / Pump ──────────────────────────────────────
  { id: 150, name: "Levrone Shaaboom Pump 385g", desc: "ما قبل التمرين Levrone Shaaboom Pump — ٣٨٥ غ.", price: 22, image: "🔥", subCategory: "ما قبل التمرين" },
  { id: 151, name: "Bad Ass Pump 350g",          desc: "ما قبل التمرين Bad Ass Pump — ٣٥٠ غ.",          price: 20, image: "💥", subCategory: "ما قبل التمرين" },

  // ── Burn / Vitamins / Health ────────────────────────────────
  { id: 160, name: "Levro Legendary Lipo Burn 90 tabs", desc: "حارق دهون Levro Legendary Lipo Burn — ٩٠ قرص.", price: 18, image: "🌶️", subCategory: "فيتامينات" },
  { id: 161, name: "Le 300g",                            desc: "Le 300g.",                                       price: 13, image: "📦", subCategory: "فيتامينات" },
  { id: 162, name: "Levrone GOLD PRO ZMAX 90 tabs",      desc: "Zinc + Magnesium + B6 — Levrone GOLD PRO ZMAX، ٩٠ قرص.", price: 14, image: "💊", subCategory: "فيتامينات" },
  { id: 163, name: "Levrone Omega 3 90 caps",            desc: "Omega 3 — Levrone، ٩٠ كبسولة.",                  price: 14, image: "🐟", subCategory: "فيتامينات" },
];
