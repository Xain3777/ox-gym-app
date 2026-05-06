import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

// Edit a saved workout plan. Same shape as POST /api/plans, applied
// as an update against an existing row. Coach + manager only.
//
// We deliberately re-declare the schemas here rather than importing
// from ../route.ts because Next.js route files don't export reliably
// in dev — keep them in sync if you change one.

const ExerciseSchema = z.object({
  name:               z.string().min(1).max(100),
  sets:               z.union([z.number(), z.string()]).optional(),
  reps:               z.string().max(50).optional(),
  rest:               z.string().max(50).optional(),
  tempo:              z.string().max(50).optional(),
  notes:              z.string().max(500).optional(),
  exercise_id:        z.string().uuid().nullable().optional(),
  exercise_name:      z.string().max(120).optional(),
  muscle_group:       z.string().max(60).nullable().optional(),
  equipment:          z.string().max(60).nullable().optional(),
  image_url:          z.string().max(500).nullable().optional(),
  machine_image_url:  z.string().max(500).nullable().optional(),
  demo_url:           z.string().max(500).nullable().optional(),
});

const WorkoutDaySchema = z.object({
  day:              z.string().min(1).max(100),
  exercises:        z.array(ExerciseSchema).max(60),
  workoutDuration:  z.number().int().min(0).max(300).optional(),
  cardioDuration:   z.number().int().min(0).max(120).optional(),
});

const PlanSchema = z.object({
  name:           z.string().min(1).max(100),
  category:       z.string().min(1).max(100),
  level:          z.enum(["beginner", "intermediate", "advanced"]),
  duration_weeks: z.number().int().min(1).max(52),
  split_type:     z.string().max(60).optional(),
  content:        z.array(WorkoutDaySchema).min(1).max(30),
});

const UuidSchema = z.string().uuid();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAuth(["manager", "coach"], request);
  if (error) return error;

  const idCheck = UuidSchema.safeParse(params.id);
  if (!idCheck.success) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Invalid plan id" }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("workout_plans")
    .update(parsed.data)
    .eq("id", idCheck.data)
    .select()
    .single();

  if (dbError || !data) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update plan" }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAuth(["manager", "coach", "reception"]);
  if (error) return error;

  const idCheck = UuidSchema.safeParse(params.id);
  if (!idCheck.success) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Invalid plan id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", idCheck.data)
    .single();

  if (dbError || !data) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}
