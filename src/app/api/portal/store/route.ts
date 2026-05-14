import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { resolveProductImage } from "@/data/product-images";

type CatalogRow = {
  id: string;
  name: string;
  category: string | null;
  item_type: string | null;
  sell_currency: "usd" | "syp" | null;
  sell_price: number | null;
  stock_quantity: number | null;
  track_stock: boolean | null;
  description: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

export async function GET(request: Request) {
  const { error } = await requireAuth(["player", "coach", "head_coach", "manager", "admin", "reception"], request);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("catalog_items")
    .select(
      "id, name, category, item_type, sell_currency, sell_price, stock_quantity, track_stock, description, image_url, sort_order, is_active",
    )
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
  }

  // Resolve image: DB column wins, fall back to the code-side map.
  const rows = ((data ?? []) as CatalogRow[]).map((row) => ({
    ...row,
    image_url: row.image_url ?? resolveProductImage(row.name),
  }));

  return NextResponse.json({ success: true, data: rows });
}
