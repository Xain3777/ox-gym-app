export interface Product {
  id: number;
  name: string;
  desc: string;
  price: number;
  image: string;
  badge?: string;
}

/** Nutritional supplements sold in the OX GYM store. Add / edit items here. */
export const supplements: Product[] = [
  { id: 101, name: "واي بروتين معزول", desc: "واي بروتين معزول ممتاز — ٢٥ غ بروتين لكل حصة. يدعم التعافي العضلي والنمو.", price: 45, image: "💪", badge: "الأكثر مبيعاً" },
  { id: 102, name: "كرياتين مونوهيدرات", desc: "كرياتين مونوهيدرات نقي لزيادة القوة والطاقة.", price: 25, image: "⚡" },
  { id: 103, name: "BCAA للتعافي", desc: "أحماض أمينية متفرعة السلسلة لتعافي عضلي أسرع وتقليل الألم.", price: 30, image: "🧪" },
  { id: 104, name: "طاقة قبل التمرين", desc: "تركيبة عالية الأداء قبل التمرين لطاقة وتركيز متفجرين.", price: 35, image: "🔥" },
  { id: 105, name: "أوميغا ٣", desc: "أحماض دهنية أساسية لصحة القلب وتقليل الالتهاب.", price: 20, image: "🐟" },
  { id: 106, name: "فيتامين D3 + K2", desc: "تركيبة مدعّمة لصحة العظام ومستويات هرمون التستوستيرون.", price: 18, image: "☀️" },
];
