import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, SectionHeader } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardTitle, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { WorkoutPlan, FitnessLevel } from "@/types";

export const metadata: Metadata = { title: "Workout Plans" };

// ── DATA ──────────────────────────────────────────────────────
async function getPlans(): Promise<WorkoutPlan[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workout_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as WorkoutPlan[];
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return [];
  }
}

// ── LEVEL BADGE VARIANT ───────────────────────────────────────
const levelVariant: Record<FitnessLevel, "gold" | "muted" | "success"> = {
  advanced:     "gold",
  intermediate: "success",
  beginner:     "muted",
};

// ── PAGE ──────────────────────────────────────────────────────
export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="WORKOUT PLANS"
        eyebrow={`${plans.length} plan${plans.length !== 1 ? "s" : ""} in library`}
        actions={
          <Link href="/plans/new">
            <Button size="sm">
              <Plus size={13} />
              New Plan
            </Button>
          </Link>
        }
      />

      <div className="p-6 pb-20 md:pb-6 flex-1">
        {plans.length === 0 ? (
          <EmptyPlans />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PLAN CARD ─────────────────────────────────────────────────
function PlanCard({ plan }: { plan: WorkoutPlan }) {
  return (
    <Link href={`/plans/${plan.id}`}>
      <Card
        hoverable
        className="h-full group transition-[border-color,transform] duration-[220ms] hover:-translate-y-0.5"
      >
        {/* Header */}
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[18px] leading-tight truncate pr-2">
            {plan.name}
          </CardTitle>
          <Badge variant={levelVariant[plan.level]}>
            {plan.level}
          </Badge>
        </CardHeader>

        {/* Body */}
        <CardBody className="pt-4">
          <p className="text-[12px] text-muted mb-3">{plan.category}</p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge variant="muted">{plan.duration_weeks}w</Badge>
            <Badge variant="muted">
              {plan.content?.length ?? 0} days
            </Badge>
          </div>

          <div className="border-t border-steel pt-3 flex items-center justify-between">
            <p className="text-[11px] text-muted">
              By {plan.created_by}
            </p>
            <p className="text-[11px] text-muted">
              {formatDate(plan.created_at)}
            </p>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────
function EmptyPlans() {
  return (
    <div className="
      flex flex-col items-center justify-center
      py-24 text-center
      border border-steel border-dashed
      bg-chevron-pattern
    ">
      <Dumbbell size={40} className="text-steel mb-4" />
      <p className="font-display text-[36px] tracking-[0.06em] text-steel leading-none mb-3">
        NO PLANS YET
      </p>
      <p className="text-[13px] text-muted mb-6">
        Create your first workout plan to start sending to members.
      </p>
      <Link href="/plans/new">
        <Button>
          <Plus size={14} />
          Create Plan
        </Button>
      </Link>
    </div>
  );
}
