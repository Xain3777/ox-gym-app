import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const FALLBACK_ITEMS = [
  {
    id: "meal_250_150",
    kind: "meal",
    name_ar: "وجبة رز ودجاج",
    name_en: "Chicken and rice meal",
    description_ar: "٢٥٠غ رز + ١٥٠غ دجاج + سلطة",
    unit_label_ar: "وجبة",
    rice_grams: 250,
    chicken_grams: 150,
    includes_salad: true,
    price_syp: 38000,
    calories: null,
  },
  {
    id: "meal_300_200",
    kind: "meal",
    name_ar: "وجبة رز ودجاج",
    name_en: "Chicken and rice meal",
    description_ar: "٣٠٠غ رز + ٢٠٠غ دجاج + سلطة",
    unit_label_ar: "وجبة",
    rice_grams: 300,
    chicken_grams: 200,
    includes_salad: true,
    price_syp: 42000,
    calories: null,
  },
  {
    id: "extra_rice_200g",
    kind: "addon",
    name_ar: "إضافة ٢٠٠غ رز",
    name_en: "Extra 200g rice",
    description_ar: "أرز إضافي مع وجبة الجيم",
    unit_label_ar: "٢٠٠غ",
    rice_grams: 200,
    chicken_grams: null,
    includes_salad: false,
    price_syp: 2000,
    calories: null,
  },
  {
    id: "extra_chicken_200g",
    kind: "addon",
    name_ar: "إضافة ٢٠٠غ دجاج",
    name_en: "Extra 200g chicken",
    description_ar: "صدر دجاج إضافي مع وجبة الجيم",
    unit_label_ar: "٢٠٠غ",
    rice_grams: null,
    chicken_grams: 200,
    includes_salad: false,
    price_syp: 15000,
    calories: null,
  },
];

export async function GET() {
  const { error } = await requireAuth(["player"]);
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("catalog_items")
    .select("id, kind, name_ar, name_en, description_ar, unit_label_ar, rice_grams, chicken_grams, includes_salad, price_syp, calories")
    .eq("is_active", true)
    .in("kind", ["meal", "addon"])
    .order("sort_order", { ascending: true });

  if (dbError) {
    return NextResponse.json({ success: true, data: FALLBACK_ITEMS, source: "fallback" });
  }

  return NextResponse.json({ success: true, data: data ?? [], source: "supabase" });
}
