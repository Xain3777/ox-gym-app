import type { Product } from "./supplements";

// In-gym items the gym actually sells from its own counter. Edit here.
// The wider "our store" idea (clothing, branded gear) is parked behind a
// "coming soon" placeholder until inventory is ready.
export const ourProducts: Product[] = [
  { id: 201, name: "ماء OX — صغير", desc: "زجاجة ماء صغيرة (٣٣٠ مل) من ثلاجة الصالة.", price: 2,  image: "💧", subCategory: "الكل" },
  { id: 202, name: "ماء OX — كبير",  desc: "زجاجة ماء كبيرة (١٫٥ ل) لجلسات التمرين الطويلة.", price: 4,  image: "🚰", subCategory: "الكل" },
  { id: 203, name: "كأس Pre-Workout", desc: "حصة جاهزة من مشروب ما قبل التمرين، تُحضّر عند الاستقبال.", price: 5,  image: "⚡", subCategory: "الكل" },
  { id: 204, name: "كأس BCAA",        desc: "حصة جاهزة من BCAA، تُحضّر عند الاستقبال.",            price: 5,  image: "🥤", subCategory: "الكل" },
];
