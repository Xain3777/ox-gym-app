import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const FALLBACK_ITEMS = [
  {
    id: "meal_250_150",
    kind: "meal",
    name_ar: "وجبة 150غ دجاج",
    name_en: "Chicken and rice meal",
    description_ar: "رز 250غ + دجاج 150غ + سلطة",
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
    name_ar: "وجبة 200غ دجاج",
    name_en: "Chicken and rice meal",
    description_ar: "رز 300غ + دجاج 200غ + سلطة",
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
  {
    id: "extra_salad",
    kind: "addon",
    name_ar: "إضافة سلطة",
    name_en: "Extra salad",
    description_ar: "حصة سلطة إضافية",
    unit_label_ar: "حصة",
    rice_grams: null,
    chicken_grams: null,
    includes_salad: false,
    price_syp: 12000,
    calories: null,
  },
];

type FoodItemRow = {
  id: string;
  name: string;
  description: string | null;
  category: "meals" | "meal_addons";
  price_syp: number;
};

export async function GET() {
  const { error } = await requireAuth(["player"]);
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("food_items")
    .select("id, name, description, category, price_syp")
    .eq("is_active", true)
    .in("category", ["meals", "meal_addons"])
    .order("sort_order", { ascending: true });

  if (dbError) {
    return NextResponse.json({ success: true, data: FALLBACK_ITEMS, source: "fallback" });
  }

  const catalogItems = ((data ?? []) as FoodItemRow[]).map((item) => ({
    id: item.id,
    kind: item.category === "meals" ? "meal" : "addon",
    name_ar: item.name,
    name_en: null,
    description_ar: item.description,
    unit_label_ar: null,
    rice_grams: null,
    chicken_grams: null,
    includes_salad: item.category === "meals" && (item.description?.includes("سلطة") ?? false),
    price_syp: item.price_syp,
    calories: null,
  }));

  return NextResponse.json({ success: true, data: catalogItems, source: "supabase" });
}
