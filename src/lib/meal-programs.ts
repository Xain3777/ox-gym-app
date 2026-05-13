import type { SupabaseClient } from "@supabase/supabase-js";

export type MealTemplateMeal = {
  id: string;
  meal_slot: string;
  name: string;
  description: string | null;
  example: string | null;
  sort_order: number;
};

export type MealTemplateDay = {
  id: string;
  day_number: number | null;
  name: string;
  day_type: string;
  notes: string | null;
  sort_order: number;
  meals: MealTemplateMeal[];
};

export type MealProgramTemplate = {
  id: string;
  key: string;
  name: string;
  category: string;
  gender_focus: string | null;
  description: string | null;
  is_active: boolean;
  days: MealTemplateDay[];
};

type DbProgramRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  gender_focus: string | null;
  description: string | null;
  is_active: boolean;
};

type DbDayRow = {
  id: string;
  template_id: string;
  day_number: number | null;
  name: string;
  day_type: string;
  notes: string | null;
  sort_order: number;
};

type DbMealRow = {
  id: string;
  template_id: string;
  day_id: string;
  meal_slot: string;
  name: string;
  description: string | null;
  example: string | null;
  sort_order: number;
};

export async function loadMealProgramTemplates(
  supabase: SupabaseClient,
): Promise<MealProgramTemplate[]> {
  const [programsRes, daysRes, mealsRes] = await Promise.all([
    supabase
      .from("meal_program_templates")
      .select("id, key, name, category, gender_focus, description, is_active")
      .order("created_at", { ascending: true }),
    supabase
      .from("meal_template_days")
      .select("id, template_id, day_number, name, day_type, notes, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("meal_template_meals")
      .select("id, template_id, day_id, meal_slot, name, description, example, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  if (programsRes.error) throw new Error(programsRes.error.message);
  if (daysRes.error) throw new Error(daysRes.error.message);
  if (mealsRes.error) throw new Error(mealsRes.error.message);

  const programs = (programsRes.data ?? []) as DbProgramRow[];
  const days = (daysRes.data ?? []) as DbDayRow[];
  const meals = (mealsRes.data ?? []) as DbMealRow[];

  const mealsByDay = new Map<string, MealTemplateMeal[]>();
  for (const m of meals) {
    const list = mealsByDay.get(m.day_id) ?? [];
    list.push({
      id: m.id,
      meal_slot: m.meal_slot,
      name: m.name,
      description: m.description,
      example: m.example,
      sort_order: m.sort_order,
    });
    mealsByDay.set(m.day_id, list);
  }

  const daysByTemplate = new Map<string, MealTemplateDay[]>();
  for (const d of days) {
    const list = daysByTemplate.get(d.template_id) ?? [];
    list.push({
      id: d.id,
      day_number: d.day_number,
      name: d.name,
      day_type: d.day_type,
      notes: d.notes,
      sort_order: d.sort_order,
      meals: mealsByDay.get(d.id) ?? [],
    });
    daysByTemplate.set(d.template_id, list);
  }

  return programs.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    category: p.category,
    gender_focus: p.gender_focus,
    description: p.description,
    is_active: p.is_active,
    days: daysByTemplate.get(p.id) ?? [],
  }));
}

export async function loadMealProgramForMember(
  supabase: SupabaseClient,
  memberId: string,
): Promise<{ assignment: { id: string; assigned_at: string } | null; template: MealProgramTemplate | null }> {
  const { data: assignment, error: assignErr } = await supabase
    .from("member_meal_programs")
    .select("id, template_id, status, assigned_at")
    .eq("member_id", memberId)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignErr) throw new Error(assignErr.message);
  if (!assignment) return { assignment: null, template: null };

  const [{ data: program }, { data: daysData }, { data: mealsData }] = await Promise.all([
    supabase
      .from("meal_program_templates")
      .select("id, key, name, category, gender_focus, description, is_active")
      .eq("id", assignment.template_id)
      .maybeSingle(),
    supabase
      .from("meal_template_days")
      .select("id, template_id, day_number, name, day_type, notes, sort_order")
      .eq("template_id", assignment.template_id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("meal_template_meals")
      .select("id, template_id, day_id, meal_slot, name, description, example, sort_order")
      .eq("template_id", assignment.template_id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!program) return { assignment: null, template: null };

  const days = (daysData ?? []) as DbDayRow[];
  const meals = (mealsData ?? []) as DbMealRow[];

  const mealsByDay = new Map<string, MealTemplateMeal[]>();
  for (const m of meals) {
    const list = mealsByDay.get(m.day_id) ?? [];
    list.push({
      id: m.id,
      meal_slot: m.meal_slot,
      name: m.name,
      description: m.description,
      example: m.example,
      sort_order: m.sort_order,
    });
    mealsByDay.set(m.day_id, list);
  }

  const template: MealProgramTemplate = {
    id: program.id,
    key: program.key,
    name: program.name,
    category: program.category,
    gender_focus: program.gender_focus,
    description: program.description,
    is_active: program.is_active,
    days: days.map((d) => ({
      id: d.id,
      day_number: d.day_number,
      name: d.name,
      day_type: d.day_type,
      notes: d.notes,
      sort_order: d.sort_order,
      meals: mealsByDay.get(d.id) ?? [],
    })),
  };

  return {
    assignment: { id: assignment.id, assigned_at: assignment.assigned_at },
    template,
  };
}

export function mealProgramDisplayName(template: { name: string; category?: string | null }): string {
  return template.name;
}

export const MEAL_SLOT_LABELS_AR: Record<string, string> = {
  breakfast: "الفطور",
  lunch: "الغداء",
  dinner: "العشاء",
  post_workout: "وجبة ما بعد التمرين",
  pre_workout: "وجبة ما قبل التمرين",
  snack: "وجبة خفيفة",
  meal: "وجبة",
};
