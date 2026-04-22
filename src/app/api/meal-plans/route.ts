import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const MealPlanSchema = z.object({
  name:           z.string().min(1).max(100),
  goal:           z.string().min(1).max(200),
  calories_daily: z.number().int().min(500).max(10_000),
  content:        z.array(z.record(z.unknown())).max(30),
});

// POST — manager + coach only
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["manager", "coach"]);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = MealPlanSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("meal_plans")
    .insert({ ...result.data, created_by: ctx.memberId })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create meal plan" }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data }, { status: 201 });
}

// GET — manager + coach + reception
export async function GET() {
  const { error } = await requireAuth(["manager", "coach", "reception"]);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("meal_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch meal plans" }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}
