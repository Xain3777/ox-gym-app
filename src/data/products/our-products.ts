import type { Product } from "./supplements";

/** OX GYM branded products (cups, shakers, snacks, etc.). Add / edit items here. */
export const ourProducts: Product[] = [
  { id: 201, name: "كوب بروتين OX", desc: "كوب بروتين حصري بتصميم OX GYM — ٢٠ غ بروتين، بنكهة الشوكولاتة.", price: 6, image: "🥤", badge: "OX حصري" },
  { id: 202, name: "شيكر OX", desc: "شيكر ٧٠٠ مل مصنوع من البلاستيك الخالي من BPA بشعار OX GYM.", price: 12, image: "🥛" },
  { id: 203, name: "بار بروتين OX", desc: "بار بروتين من إنتاج OX GYM — ٢٥ غ بروتين، بدون سكر مضاف.", price: 5, image: "🍫", badge: "جديد" },
  { id: 204, name: "مسحوق كولاجين", desc: "كولاجين نوع I وIII لصحة المفاصل والجلد، بدون نكهة.", price: 28, image: "✨" },
  { id: 205, name: "عصير OX الطبيعي", desc: "مشروب طاقة طبيعي بدون منشطات صناعية، ٥ نكهات.", price: 4, image: "🍊" },
];
