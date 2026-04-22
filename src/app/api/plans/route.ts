import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const ExerciseSchema = z.object({
  name:  z.string().min(1).max(100),
  sets:  z.number().int().min(1).max(20),
  reps:  z.string().min(1).max(50),   // "8-12" | "AMRAP" | "30s"
  notes: z.string().max(300).optional(),
});

const WorkoutDaySchema = z.object({
  day:              z.string().min(1).max(100),
  exercises:        z.array(ExerciseSchema).max(30),
  workoutDuration:  z.number().int().min(0).max(300).optional(),
  cardioDuration:   z.number().int().min(0).max(120).optional(),
});

const PlanSchema = z.object({
  name:           z.string().min(1).max(100),
  category:       z.string().min(1).max(100),
  level:          z.enum(["beginner", "intermediate", "advanced"]),
  duration_weeks: z.number().int().min(1).max(52),
  split_type:     z.string().max(20).optional(),
  content:        z.array(WorkoutDaySchema).min(1).max(30),
});

// POST — manager + coach only
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["manager", "coach"], request);
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
