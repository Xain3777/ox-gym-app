import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase";
import { CreatePlanForm } from "@/components/admin/CreatePlanForm";
import type { WorkoutPlan } from "@/types";

export const metadata: Metadata = { title: "Edit Plan" };

async function getPlan(id: string): Promise<WorkoutPlan | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as WorkoutPlan;
  } catch {
    return null;
  }
}

export default async function CoachEditPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const plan = await getPlan(params.id);
  if (!plan) notFound();

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[28px] tracking-wider text-white truncate">
          Edit: {plan.name}
        </h1>
        <Link
          href="/coach/plans"
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-[12px] font-mono uppercase tracking-wider transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} />
          Plans
        </Link>
      </div>
      <CreatePlanForm initialData={plan} returnPath="/coach/plans" />
    </div>
  );
}
