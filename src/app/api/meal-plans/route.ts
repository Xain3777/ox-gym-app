import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const MealItemSchema = z.object({
  name:     z.string().min(1).max(100),
  portion:  z.string().min(1).max(100),
  calories: z.number().int().min(0).max(5_000),
  protein:  z.number().min(0).max(500),
  carbs:    z.number().min(0).max(500),
  fat:      z.number().min(0).max(500),
});

const MealSlotSchema = z.object({
  name:  z.string().min(1).max(100),
  items: z.array(MealItemSchema).max(20),
});

const MealDaySchema = z.object({
  day:   z.string().min(1).max(100),
  meals: z.array(MealSlotSchema).max(10),
});

const MealPlanSchema = z.object({
  name:           z.string().min(1).max(100),
  goal:           z.string().min(1).max(200),
  calories_daily: z.number().int().min(500).max(10_000),
  content:        z.array(MealDaySchema).min(1).max(30),
});

// POST — manager + coach only
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["manager", "coach"], request);
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
