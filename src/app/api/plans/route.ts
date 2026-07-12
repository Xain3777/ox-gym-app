import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

// Schema for an exercise inside a plan day.
//
// Migration 016 made the coach plan builder library-aware: each
// exercise can carry the originating exercise_id + image refs +
// equipment + muscle group, and sets/reps/rest/tempo are *manually*
// filled by the coach. The spec says these four fields should default
// to empty strings — so this schema accepts empty values and either
// `number` or `string` for sets (older plans saved sets as int; new
// plans save sets as a free string like "" or "4" or "as many").
//
// Older saved plans only have { name, sets:int, reps:string, notes? }
// and validate cleanly against this looser shape — backward-compatible.
const ExerciseSchema = z.object({
  // Required: every exercise has a display name (kept for old plans).
  name:               z.string().min(1).max(100),

  // Manual coach-filled values — empty by default.
  sets:               z.union([z.number(), z.string()]).optional(),
  reps:               z.string().max(50).optional(),
  rest:               z.string().max(50).optional(),
  tempo:              z.string().max(50).optional(),
  notes:              z.string().max(500).optional(),

  // Library-aware metadata (migration 016).
  exercise_id:        z.string().uuid().nullable().optional(),
  exercise_name:      z.string().max(120).optional(),
  muscle_group:       z.string().max(60).nullable().optional(),
  equipment:          z.string().max(60).nullable().optional(),
  image_url:          z.string().max(500).nullable().optional(),
  machine_image_url:  z.string().max(500).nullable().optional(),
  machine_name:       z.string().max(120).nullable().optional(),
  demo_url:           z.string().max(500).nullable().optional(),

  // Nested media block — the shape the player portal renders. Zod
  // strips unknown keys by default, so this MUST be declared or the
  // coach-picked pictures silently vanish on save.
  media: z.object({
    machine_name:      z.string().max(120).nullable().optional(),
    machine_image_url: z.string().max(500).nullable().optional(),
    demo_image_url:    z.string().max(500).nullable().optional(),
    demo_video_url:    z.string().max(500).nullable().optional(),
    instructions:      z.string().max(1000).nullable().optional(),
  }).nullable().optional(),
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
