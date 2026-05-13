import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { loadMealProgramTemplates } from "@/lib/meal-programs";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;

const nullableText = (max = 500) => z.string().trim().max(max).nullable().optional();
const DayTypeSchema = z.enum(["training", "rest", "flexible"]);
const MealSlotSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "post_workout",
  "pre_workout",
  "snack",
  "meal",
]);

const PatchSchema = z.discriminatedUnion("kind", [
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
    day_type: DayTypeSchema.optional(),
    notes: nullableText(1000),
    sort_order: z.number().int().min(0).max(500).optional(),
  }),
  z.object({
    kind: z.literal("meal"),
    id: z.string().uuid(),
    meal_slot: MealSlotSchema.optional(),
    name: z.string().trim().min(1).max(160),
    description: nullableText(1000),
    example: nullableText(1000),
    sort_order: z.number().int().min(0).max(500).optional(),
  }),
]);

const CreateSchema = z.discriminatedUnion("kind", [
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
    day_type: DayTypeSchema.optional(),
    notes: nullableText(1000),
    sort_order: z.number().int().min(0).max(500).optional(),
  }),
  z.object({
    kind: z.literal("meal"),
    day_id: z.string().uuid(),
    meal_slot: MealSlotSchema.optional(),
    name: z.string().trim().min(1).max(160),
    description: nullableText(1000),
    example: nullableText(1000),
    sort_order: z.number().int().min(0).max(500).optional(),
  }),
]);

const DeleteSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("program"), id: z.string().uuid() }),
  z.object({ kind: z.literal("day"), id: z.string().uuid() }),
  z.object({ kind: z.literal("meal"), id: z.string().uuid() }),
]);

export async function GET(request: Request) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  try {
    const supabase = createServiceClient();
    const data = await loadMealProgramTemplates(supabase);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load meal programs";
    return NextResponse.json(
      { success: false, error: missingTableMessage(message) },
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

  const parsed = PatchSchema.safeParse(body);
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
      .from("meal_program_templates")
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
      .from("meal_template_days")
      .update({
        name: payload.name,
        day_number: payload.day_number ?? null,
        day_type: payload.day_type ?? "training",
        notes: payload.notes ?? null,
        sort_order: payload.sort_order,
      })
      .eq("id", payload.id);

    if (dbError) return NextResponse.json({ success: false, error: "Failed to update day" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error: dbError } = await supabase
    .from("meal_template_meals")
    .update({
      meal_slot: payload.meal_slot ?? "meal",
      name: payload.name,
      description: payload.description ?? null,
      example: payload.example ?? null,
      sort_order: payload.sort_order,
    })
    .eq("id", payload.id);

  if (dbError) return NextResponse.json({ success: false, error: "Failed to update meal" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
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

    const { data, error: insertError } = await supabase
      .from("meal_program_templates")
      .insert(row)
      .select("id")
      .single();

    if (insertError || !data) {
      return NextResponse.json(
        { success: false, error: missingTableMessage(insertError?.message ?? "Failed to create program") },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, data });
  }

  if (payload.kind === "day") {
    const { data: template, error: templateError } = await supabase
      .from("meal_program_templates")
      .select("id")
      .eq("id", payload.template_id)
      .maybeSingle();

    if (templateError || !template) {
      return NextResponse.json({ success: false, error: "Meal program not found" }, { status: 404 });
    }

    let sortOrder = payload.sort_order;
    if (sortOrder == null) {
      const { data: existing } = await supabase
        .from("meal_template_days")
        .select("sort_order")
        .eq("template_id", payload.template_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;
    }

    const { data, error: insertError } = await supabase
      .from("meal_template_days")
      .insert({
        template_id: payload.template_id,
        day_number: payload.day_number ?? sortOrder + 1,
        name: payload.name,
        day_type: payload.day_type ?? "training",
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

  // kind === "meal"
  const { data: day, error: dayError } = await supabase
    .from("meal_template_days")
    .select("id, template_id")
    .eq("id", payload.day_id)
    .maybeSingle();

  if (dayError || !day) {
    return NextResponse.json({ success: false, error: "Meal day not found" }, { status: 404 });
  }

  let sortOrder = payload.sort_order;
  if (sortOrder == null) {
    const { data: existing } = await supabase
      .from("meal_template_meals")
      .select("sort_order")
      .eq("day_id", payload.day_id)
      .order("sort_order", { ascending: false })
      .limit(1);
    sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;
  }

  const { data, error: insertError } = await supabase
    .from("meal_template_meals")
    .insert({
      template_id: day.template_id,
      day_id: payload.day_id,
      meal_slot: payload.meal_slot ?? "meal",
      name: payload.name,
      description: payload.description ?? null,
      example: payload.example ?? null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return NextResponse.json({ success: false, error: "Failed to create meal" }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
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
  const table =
    payload.kind === "program" ? "meal_program_templates"
      : payload.kind === "day" ? "meal_template_days"
        : "meal_template_meals";

  const { error: dbError } = await supabase.from(table).delete().eq("id", payload.id);
  if (dbError) {
    return NextResponse.json({ success: false, error: `Failed to delete ${payload.kind}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

function missingTableMessage(message: string): string {
  if (message.includes("meal_program_templates") || message.includes("schema cache")) {
    return "Meal program library tables not found. Apply migrations 038 and 039 in Supabase.";
  }
  return message || "Meal program library is not ready.";
}
