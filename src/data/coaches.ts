// ═══════════════════════════════════════════════════════════════
// OX GYM — COACHES ROSTER (Arabic)
//
// Source of truth for the gym's coaching team. Consumed by the
// portal /portal/coaches page. Keep entries ordered by seniority /
// preference of display, not alphabetically.
//
// Coach photos live in: public/coaches/
//   The `image` field below is a public path (served from /coaches/...).
//   If a file is missing or fails to load, the page falls back to a
//   clean "صورة المدرب" placeholder — see public/coaches/README.md.
// ═══════════════════════════════════════════════════════════════

export interface CoachAr {
  name: string;
  title: string;
  specialty: string[];
  experience: string;
  education: string;
  achievements: string[];
  /** Public path under /public — drop the file at the matching path. */
  image: string;
}

export const COACHES_AR: readonly CoachAr[] = [
  {
    name: "عبد",
    title: "الكوتش",
    specialty: ["حديد", "كاليسثنكس"],
    experience: "٦ سنوات",
    education: "كلية رياضة",
    achievements: ["بطل مستر يونيفرس ٢٠٢٣"],
    image: "/coaches/abd.jpg",
  },
  {
    name: "علي",
    title: "الكوتش",
    specialty: ["حديد"],
    experience: "٦ سنوات",
    education: "معهد تجاري",
    achievements: [],
    image: "/coaches/ali.jpg",
  },
  {
    name: "عابد صالح",
    title: "الكوتش",
    specialty: ["بناء أجسام", "لياقة بدنية"],
    experience: "٦ سنوات",
    education: "كلية الحقوق",
    achievements: ["شهادة تدريب وتحكيم من الاتحاد الرياضي"],
    image: "/coaches/abed-saleh.jpg",
  },
  {
    name: "نجدت",
    title: "الكابتن",
    specialty: ["تدريب"],
    experience: "١٤ سنة",
    education: "معهد متوسط كهرباء",
    achievements: [],
    image: "/coaches/najdat.jpg",
  },
  {
    name: "هديل مصطفى",
    title: "الكوتش",
    specialty: ["حديد", "أيروبيك"],
    experience: "٥ سنوات",
    education: "هندسة زراعية",
    achievements: [],
    image: "/coaches/hadeel-mustafa.jpg",
  },
  {
    name: "ذوالفقار",
    title: "الكوتش",
    specialty: ["كاليسثنكس", "حديد"],
    experience: "٧ سنوات",
    education: "كلية التمريض",
    achievements: ["بطل جمهورية ٥ سنوات في مصارعة الأذرع"],
    image: "/coaches/thulfiqar.jpg",
  },
  {
    name: "مرام مخلوف",
    title: "الكوتش",
    specialty: ["حديد"],
    experience: "٥ سنوات",
    education: "تجارة واقتصاد",
    achievements: [],
    image: "/coaches/maram-makhlouf.jpg",
  },
  {
    name: "سومر خدام",
    title: "الكوتش",
    specialty: ["حديد", "لياقة بدنية"],
    experience: "٧ سنوات",
    education: "هندسة الطاقة الكهربائية",
    achievements: [],
    image: "/coaches/somer-khaddam.jpg",
  },
  {
    name: "عمر فوز",
    title: "الكوتش",
    specialty: ["كمال أجسام"],
    experience: "+٧ سنوات",
    education: "كلية العلوم - كيمياء",
    achievements: ["بطل كأس عالم"],
    image: "/coaches/omar-fawz.jpg",
  },
];
