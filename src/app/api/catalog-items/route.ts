import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase";

const STORE_ROLES = ["manager", "admin", "reception"] as const;

const CurrencySchema = z.enum(["usd", "syp"]);

const CatalogItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  item_type: z.string().trim().min(1).max(60).default("product"),
  sell_currency: CurrencySchema,
  sell_price: z.number().min(0),
  cost_currency: CurrencySchema.nullish(),
  cost_price: z.number().min(0).nullish(),
  stock_quantity: z.number().int().min(0).default(0),
  track_stock: z.boolean().default(true),
  low_stock_threshold: z.number().int().min(0).default(0),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  description: z.string().trim().max(500).nullish(),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAuth([...STORE_ROLES, "coach", "head_coach"], request);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("catalog_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth([...STORE_ROLES], request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CatalogItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const item = {
    id: parsed.data.id ?? crypto.randomUUID(),
    name: parsed.data.name,
    category: parsed.data.category,
    item_type: parsed.data.item_type,
    sell_currency: parsed.data.sell_currency,
    sell_price: parsed.data.sell_price,
    cost_currency: parsed.data.cost_currency ?? null,
    cost_price: parsed.data.cost_price ?? null,
    stock_quantity: parsed.data.stock_quantity,
    track_stock: parsed.data.track_stock,
    low_stock_threshold: parsed.data.low_stock_threshold,
    sort_order: parsed.data.sort_order,
    is_active: parsed.data.is_active,
    description: parsed.data.description ?? null,
  };

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("catalog_items")
    .insert(item)
    .select("*")
    .single();

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
