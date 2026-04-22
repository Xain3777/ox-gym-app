import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const PlanSchema = z.object({
  name:           z.string().min(1).max(100),
  category:       z.string().min(1).max(100),
  level:          z.enum(["beginner", "intermediate", "advanced"]),
  duration_weeks: z.number().int().min(1).max(52),
  content:        z.array(z.record(z.unknown())).max(30),
});

// POST — manager + coach only
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["manager", "coach"]);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = PlanSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("workout_plans")
    .insert({ ...result.data, created_by: ctx.memberId })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create plan" }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data }, { status: 201 });
}

// GET — manager + coach + reception
export async function GET() {
  const { error } = await requireAuth(["manager", "coach", "reception"]);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("workout_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch plans" }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}
