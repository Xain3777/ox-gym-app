import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, StripeDivider } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { WorkoutPlan, FitnessLevel } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const plan = await getPlan(params.id);
    return { title: plan?.name ?? "Plan" };
  } catch {
    return { title: "Plan" };
  }
}

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
  } catch (error) {
    console.error("Failed to fetch plan:", error);
    return null;
  }
}

const levelVariant: Record<FitnessLevel, "gold" | "muted" | "success"> = {
  advanced: "gold",
  intermediate: "success",
  beginner: "muted",
};

export default async function PlanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const plan = await getPlan(params.id);
  if (!plan) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title={plan.name}
        eyebrow={`${plan.category} · ${plan.level}`}
        actions={
          <Link href="/plans">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              Back
            </Button>
          </Link>
        }
      />
      <StripeDivider />

      <div className="p-6 pb-20 md:pb-6 flex-1 space-y-6">
        {/* Plan info */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={levelVariant[plan.level]}>{plan.level}</Badge>
          <Badge variant="muted">{plan.duration_weeks}w</Badge>
          <Badge variant="muted">{plan.content?.length ?? 0} days</Badge>
          <span className="text-[11px] text-muted ml-auto">
            By {plan.created_by} · {formatDate(plan.created_at)}
          </span>
        </div>

        {/* Workout days */}
        {plan.content?.map((day, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-[16px] flex items-center gap-2">
                <Dumbbell size={14} className="text-gold" />
                {day.day}
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-3">
              <div className="space-y-2">
                {day.exercises.map((ex, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between text-[13px] py-1.5 border-b border-steel last:border-0"
                  >
                    <span className="text-offwhite">{ex.name}</span>
                    <span className="text-muted font-mono text-[12px]">
                      {ex.sets} × {ex.reps}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
