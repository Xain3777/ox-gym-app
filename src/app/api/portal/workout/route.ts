import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { loadTemplateDays } from "@/lib/workout-programs";
import { playerWorkoutProgramName } from "@/lib/workout-display";

export async function GET() {
  const { ctx, error } = await requireAuth(["player"]);
  if (error) return error;

  const service = createServiceClient();

  const { data: assignment } = await service
    .from("member_workout_programs")
    .select("id, assigned_at, template:workout_program_templates(id, name, category, gender_focus)")
    .eq("member_id", ctx.memberId)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const template = Array.isArray(assignment?.template)
    ? assignment?.template[0]
    : assignment?.template;

  if (template?.id) {
    const days = await loadTemplateDays(service, template.id);
    return NextResponse.json({
      success: true,
      data: {
        id: assignment?.id,
        name: playerWorkoutProgramName(template),
        category: template.category,
        content: days.map((day) => ({
          day: day.name,
          day_type: day.day_type,
          sets_reps: day.sets_reps,
          cardio: day.cardio,
          options: day.options,
          sections: day.sections,
          exercises: [
            ...day.exercises,
            ...day.sections.flatMap((section) =>
              section.exercises.map((exercise) => ({
                ...exercise,
                section: section.muscle_group ?? section.name,
              })),
            ),
          ],
        })),
      },
    });
  }

  const { data: send } = await service
    .from("plan_sends")
    .select("plan_id")
    .eq("member_id", ctx.memberId)
    .eq("plan_type", "workout")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!send) return NextResponse.json({ success: true, data: null });

  const { data: plan } = await service
    .from("workout_plans")
    .select("*")
    .eq("id", send.plan_id)
    .single();

  return NextResponse.json({ success: true, data: plan ?? null });
}
