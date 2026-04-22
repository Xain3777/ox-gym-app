import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const OrderSchema = z.object({
  item_id:   z.string().min(1).max(50),
  item_name: z.string().min(1).max(200),
  price:     z.number().min(0).max(10_000),
  calories:  z.number().int().min(0).max(5_000),
});

export async function GET() {
  const { ctx, error } = await requireAuth(["player"]);
  if (error) return error;

  const service = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await service
    .from("meal_orders")
    .select("item_id")
    .eq("member_id", ctx.memberId)
    .gte("ordered_at", today.toISOString());

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = OrderSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const { data, error: dbError } = await service
    .from("meal_orders")
    .insert({ member_id: ctx.memberId, ...result.data, status: "pending" })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to place order" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { order_id: data.id } });
}
