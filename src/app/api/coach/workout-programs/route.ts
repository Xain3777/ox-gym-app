import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import {
  ensureLegacyWorkoutPlansSeeded,
  ensureWorkoutProgramSeeded,
  loadLegacyWorkoutProgramTemplates,
  loadWorkoutProgramTemplates,
} from "@/lib/workout-programs";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;

const nullableText = (max = 500) => z.string().trim().max(max).nullable().optional();
const DayTypeSchema = z.enum(["training", "rest", "flexible", "workout_day", "rest_day", "flexible_day"]);

function normalizeDayType(value: z.infer<typeof DayTypeSchema>): "training" | "rest" | "flexible" {
  if (value === "rest" || value === "rest_day") return "rest";
  if (value === "flexible" || value === "flexible_day") return "flexible";
  return "training";
}

const ProgramPatchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("program"),
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(140),
    category: z.string().trim().min(1).max(120),
    gender_focus: nullableText(60),
    description: nullableText(1000),
    is_active: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("day"),
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(140),
    day_number: z.number().int().min(1).max(500).nullable().optional(),
    sets_reps: nullableText(80),
    day_type: DayTypeSchema,
    notes: nullableText(1000),
    sort_order: z.number().int().min(0).max(500).optional(),
  }),
  z.object({
    kind: z.literal("exercise"),
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(160),
    sets_reps: nullableText(80),
    rest: nullableText(80),
    duration: nullableText(80),
    notes: nullableText(1000),
    sort_order: z.number().int().min(0).max(1000).optional(),
    media: z.object({
      machine_name: nullableText(120),
      machine_image_url: nullableText(500),
      demo_image_url: nullableText(500),
      demo_video_url: nullableText(500),
      instructions: nullableText(1000),
    }).optional(),
  }),
]);

const WorkoutCreateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("program"),
    name: z.string().trim().min(1).max(140),
    category: z.string().trim().min(1).max(120),
    gender_focus: nullableText(60),
    description: nullableText(1000),
    is_active: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("day"),
    template_id: z.string().uuid(),
    name: z.string().trim().min(1).max(140),
    day_number: z.number().int().min(1).max(500).nullable().optional(),
    sets_reps: nullableText(80),
    day_type: DayTypeSchema,
    notes: nullableText(1000),
    sort_order: z.number().int().min(0).max(500).optional(),
  }),
  z.object({
    kind: z.literal("exercise"),
    day_id: z.string().uuid(),
    section_id: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1).max(160),
    sets_reps: nullableText(80),
    rest: nullableText(80),
    duration: nullableText(80),
    notes: nullableText(1000),
    instructions: nullableText(1000),
    sort_order: z.number().int().min(0).max(1000).optional(),
    media: z.object({
      machine_name: nullableText(120),
      machine_image_url: nullableText(500),
      demo_image_url: nullableText(500),
      demo_video_url: nullableText(500),
      instructions: nullableText(1000),
    }).optional(),
  }),
  z.object({
    kind: z.literal("legacy_exercise"),
    plan_id: z.string().uuid(),
    day_index: z.number().int().min(0).max(100),
    section_name: nullableText(120),
    name: z.string().trim().min(1).max(160),
    sets_reps: nullableText(80),
    rest: nullableText(80),
    duration: nullableText(80),
    notes: nullableText(1000),
    instructions: nullableText(1000),
    sort_order: z.number().int().min(0).max(1000).optional(),
    media: z.object({
      machine_name: nullableText(120),
      machine_image_url: nullableText(500),
      demo_image_url: nullableText(500),
      demo_video_url: nullableText(500),
      instructions: nullableText(1000),
    }).optional(),
  }),
]);

const DeleteSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("day"), id: z.string().uuid() }),
  z.object({ kind: z.literal("exercise"), id: z.string().uuid() }),
]);

export async function GET() {
  const { error } = await requireAuth([...COACH_ROLES]);
  if (error) return error;

  try {
    const supabase = createServiceClient();
    await ensureWorkoutProgramSeeded(supabase);
    const data = await loadWorkoutProgramTemplates(supabase);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("workout_program_templates") || message.includes("schema cache")) {
      try {
        const supabase = createServiceClient();
        await ensureLegacyWorkoutPlansSeeded(supabase);
        const data = await loadLegacyWorkoutProgramTemplates(supabase);
        return NextResponse.json({ success: true, data, fallback: "workout_plans" });
      } catch (fallbackErr) {
        return NextResponse.json(
          {
            success: false,
            error: fallbackErr instanceof Error
              ? fallbackErr.message
              : "Workout program library is not ready. Apply migrations 018 and 019.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: message || "Workout program library is not ready. Apply migrations 018 and 019.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = ProgramPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const payload = parsed.data;

  if (payload.kind === "program") {
    const { error: dbError } = await supabase
      .from("workout_program_templates")
      .update({
        name: payload.name,
        category: payload.category,
        gender_focus: payload.gender_focus ?? null,
        description: payload.description ?? null,
        is_active: payload.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id);

    if (dbError) return NextResponse.json({ success: false, error: "Failed to update program" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (payload.kind === "day") {
    const { error: dbError } = await supabase
      .from("workout_template_days")
      .update({
        name: payload.name,
        day_number: payload.day_number ?? null,
        sets_reps: payload.sets_reps ?? null,
        day_type: normalizeDayType(payload.day_type),
        notes: payload.notes ?? null,
        sort_order: payload.sort_order,
      })
      .eq("id", payload.id);

    if (dbError) return NextResponse.json({ success: false, error: "Failed to update day" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data: exercise, error: exerciseReadError } = await supabase
    .from("workout_template_exercises")
    .select("id, exercise_media_id")
    .eq("id", payload.id)
    .single();

  if (exerciseReadError || !exercise) {
    return NextResponse.json({ success: false, error: "Exercise not found" }, { status: 404 });
  }

  let mediaId = exercise.exercise_media_id as string | null;
  if (!mediaId) {
    const { data: media, error: mediaInsertError } = await supabase
      .from("exercise_media")
      .insert({
        exercise_name: payload.name,
        machine_name: payload.media?.machine_name ?? payload.name,
        machine_image_url: payload.media?.machine_image_url ?? null,
        demo_image_url: payload.media?.demo_image_url ?? null,
        demo_video_url: payload.media?.demo_video_url ?? null,
        instructions: payload.media?.instructions ?? null,
      })
      .select("id")
      .single();

    if (mediaInsertError || !media) {
      return NextResponse.json({ success: false, error: "Failed to create exercise media" }, { status: 500 });
    }
    mediaId = media.id as string;
  } else if (payload.media) {
    const { error: mediaUpdateError } = await supabase
      .from("exercise_media")
      .update({
        exercise_name: payload.name,
        machine_name: payload.media.machine_name ?? null,
        machine_image_url: payload.media.machine_image_url ?? null,
        demo_image_url: payload.media.demo_image_url ?? null,
        demo_video_url: payload.media.demo_video_url ?? null,
        instructions: payload.media.instructions ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mediaId);

    if (mediaUpdateError) {
      return NextResponse.json({ success: false, error: "Failed to update exercise media" }, { status: 500 });
    }
  }

  const { error: exerciseUpdateError } = await supabase
    .from("workout_template_exercises")
    .update({
      exercise_media_id: mediaId,
      name: payload.name,
      sets_reps: payload.sets_reps ?? null,
      rest: payload.rest ?? null,
      duration: payload.duration ?? null,
      instructions: payload.media?.instructions ?? null,
      notes: payload.notes ?? null,
      sort_order: payload.sort_order,
    })
    .eq("id", payload.id);

  if (exerciseUpdateError) {
    return NextResponse.json({ success: false, error: "Failed to update exercise" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = WorkoutCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const supabase = createServiceClient();

  if (payload.kind === "program") {
    const row = {
      key: `custom_${crypto.randomUUID()}`,
      name: payload.name,
      category: payload.category,
      gender_focus: payload.gender_focus ?? null,
      description: payload.description ?? null,
      is_active: payload.is_active ?? true,
    };

    let { data, error: insertError } = await supabase
      .from("workout_program_templates")
      .insert({
        ...row,
        created_by: ctx.memberId,
      })
      .select("id")
      .single();

    if (insertError && isMissingColumnError(insertError, "created_by")) {
      const retry = await supabase
        .from("workout_program_templates")
        .insert(row)
        .select("id")
        .single();
      data = retry.data;
      insertError = retry.error;
    }

    if (insertError || !data) {
      return NextResponse.json({
        success: false,
        error: createProgramErrorMessage(insertError),
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  }

  if (payload.kind === "day") {
    const { data: template, error: templateError } = await supabase
      .from("workout_program_templates")
      .select("id")
      .eq("id", payload.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ success: false, error: "Workout program not found" }, { status: 404 });
    }

    let sortOrder = payload.sort_order;
    if (sortOrder == null) {
      const { data: existing } = await supabase
        .from("workout_template_days")
        .select("sort_order")
        .eq("template_id", payload.template_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;
    }

    const { data, error: insertError } = await supabase
      .from("workout_template_days")
      .insert({
        template_id: payload.template_id,
        day_number: payload.day_number ?? sortOrder + 1,
        name: payload.name,
        sets_reps: payload.sets_reps ?? null,
        day_type: normalizeDayType(payload.day_type),
        notes: payload.notes ?? null,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      return NextResponse.json({ success: false, error: "Failed to create day" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  }

  if (payload.kind === "legacy_exercise") {
    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .select("id, content")
      .eq("id", payload.plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ success: false, error: "Workout plan not found" }, { status: 404 });
    }

    const content = Array.isArray(plan.content) ? [...plan.content] : [];
    const day = content[payload.day_index] as { exercises?: unknown[] } | undefined;
    if (!day) {
      return NextResponse.json({ success: false, error: "Workout day not found" }, { status: 404 });
    }

    const exercises = Array.isArray(day.exercises) ? [...day.exercises] : [];
    const exercise = {
      name: payload.name,
      sets_reps: payload.sets_reps ?? null,
      rest: payload.rest ?? null,
      duration: payload.duration ?? null,
      notes: payload.notes ?? null,
      section: payload.section_name ?? null,
      media: {
        exercise_name: payload.name,
        machine_name: payload.media?.machine_name ?? payload.name,
        machine_image_url: payload.media?.machine_image_url ?? null,
        demo_image_url: payload.media?.demo_image_url ?? null,
        demo_video_url: payload.media?.demo_video_url ?? null,
        instructions: payload.media?.instructions ?? payload.instructions ?? null,
      },
    };

    const insertAt = payload.sort_order == null ? exercises.length : Math.min(payload.sort_order, exercises.length);
    exercises.splice(insertAt, 0, exercise);
    content[payload.day_index] = { ...day, exercises };

    const { error: updateError } = await supabase
      .from("workout_plans")
      .update({ content })
      .eq("id", payload.plan_id);

    if (updateError) {
      return NextResponse.json({ success: false, error: "Failed to create exercise" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  const { data: day, error: dayError } = await supabase
    .from("workout_template_days")
    .select("id, template_id")
    .eq("id", payload.day_id)
    .single();

  if (dayError || !day) {
    return NextResponse.json({ success: false, error: "Workout day not found" }, { status: 404 });
  }

  if (payload.section_id) {
    const { data: section, error: sectionError } = await supabase
      .from("workout_template_sections")
      .select("id")
      .eq("id", payload.section_id)
      .eq("day_id", payload.day_id)
      .single();

    if (sectionError || !section) {
      return NextResponse.json({ success: false, error: "Workout section not found" }, { status: 404 });
    }
  }

  const mediaInstructions = payload.media?.instructions ?? payload.instructions ?? null;
  const { data: media, error: mediaError } = await supabase
    .from("exercise_media")
    .upsert({
      exercise_name: payload.name,
      machine_name: payload.media?.machine_name ?? payload.name,
      machine_image_url: payload.media?.machine_image_url ?? null,
      demo_image_url: payload.media?.demo_image_url ?? null,
      demo_video_url: payload.media?.demo_video_url ?? null,
      instructions: mediaInstructions,
      updated_at: new Date().toISOString(),
    }, { onConflict: "exercise_name" })
    .select("id")
    .single();

  if (mediaError || !media) {
    return NextResponse.json({ success: false, error: "Failed to link exercise media" }, { status: 500 });
  }

  let sortOrder = payload.sort_order;
  if (sortOrder == null) {
    const { data: existing } = await supabase
      .from("workout_template_exercises")
      .select("sort_order")
      .eq("day_id", payload.day_id)
      .order("sort_order", { ascending: false })
      .limit(1);
    sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;
  }

  const { data, error: insertError } = await supabase
    .from("workout_template_exercises")
    .insert({
      template_id: day.template_id,
      day_id: payload.day_id,
      section_id: payload.section_id ?? null,
      exercise_media_id: media.id,
      name: payload.name,
      sets_reps: payload.sets_reps ?? null,
      rest: payload.rest ?? null,
      duration: payload.duration ?? null,
      instructions: payload.instructions ?? mediaInstructions,
      notes: payload.notes ?? null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return NextResponse.json({ success: false, error: "Failed to create exercise" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

function isMissingColumnError(error: { code?: string; message?: string } | null, column: string): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST204" || message.includes(`'${column.toLowerCase()}'`);
}

function createProgramErrorMessage(error: { message?: string } | null): string {
  const message = error?.message ?? "";
  if (message.includes("workout_program_templates") || message.includes("schema cache")) {
    return "Workout program library database tables are not ready. Apply the workout program migrations in Supabase.";
  }

  return "Failed to create program";
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const payload = parsed.data;
  const table = payload.kind === "day" ? "workout_template_days" : "workout_template_exercises";
  const { error: dbError } = await supabase.from(table).delete().eq("id", payload.id);

  if (dbError) {
    return NextResponse.json({ success: false, error: `Failed to delete ${payload.kind}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
