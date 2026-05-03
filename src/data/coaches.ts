// ═══════════════════════════════════════════════════════════════
// OX GYM — COACHES ROSTER (Arabic)
//
// Source of truth for the gym's coaching team. Consumed by the
// portal /portal/coaches page. Keep entries ordered by seniority /
// preference of display, not alphabetically.
// ═══════════════════════════════════════════════════════════════

export interface CoachAr {
  name: string;
  title: string;
  specialty: string[];
  experience: string;
  education: string;
  achievements: string[];
}

export const COACHES_AR: readonly CoachAr[] = [
  {
    name: "عبد",
    title: "الكوتش",
    specialty: ["حديد", "كاليسثنكس"],
    experience: "٦ سنوات",
    education: "كلية رياضة",
    achievements: ["بطل مستر يونيفرس ٢٠٢٣"],
  },
  {
    name: "علي",
    title: "الكوتش",
    specialty: ["حديد"],
    experience: "٦ سنوات",
    education: "معهد تجاري",
    achievements: [],
  },
  {
    name: "عابد صالح",
    title: "الكوتش",
    specialty: ["بناء أجسام", "لياقة بدنية"],
    experience: "٦ سنوات",
    education: "كلية الحقوق",
    achievements: ["شهادة تدريب وتحكيم من الاتحاد الرياضي"],
  },
  {
    name: "نجدت",
    title: "الكابتن",
    specialty: ["تدريب"],
    experience: "١٤ سنة",
    education: "معهد متوسط كهرباء",
    achievements: [],
  },
  {
    name: "هديل مصطفى",
    title: "الكوتش",
    specialty: ["حديد", "أيروبيك"],
    experience: "٥ سنوات",
    education: "هندسة زراعية",
    achievements: [],
  },
  {
    name: "ذوالفقار",
    title: "الكوتش",
    specialty: ["كاليسثنكس", "حديد"],
    experience: "٧ سنوات",
    education: "كلية التمريض",
    achievements: ["بطل جمهورية ٥ سنوات في مصارعة الأذرع"],
  },
  {
    name: "مرام مخلوف",
    title: "الكوتش",
    specialty: ["حديد"],
    experience: "٥ سنوات",
    education: "تجارة واقتصاد",
    achievements: [],
  },
  {
    name: "سومر خدام",
    title: "الكوتش",
    specialty: ["حديد", "لياقة بدنية"],
    experience: "٧ سنوات",
    education: "هندسة الطاقة الكهربائية",
    achievements: [],
  },
  {
    name: "عمر فوز",
    title: "الكوتش",
    specialty: ["كمال أجسام"],
    experience: "+٧ سنوات",
    education: "كلية العلوم - كيمياء",
    achievements: ["بطل كأس عالم"],
  },
];
