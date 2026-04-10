import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UtensilsCrossed } from "lucide-react";
import { createServiceClient } from "@/lib/supabase";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { MealPlan } from "@/types";

export const metadata: Metadata = { title: "Meal Plans" };

// ── DATA ──────────────────────────────────────────────────────
async function getMealPlans(): Promise<MealPlan[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("meal_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as MealPlan[];
  } catch {
    return [];
  }
}

// ── PAGE ──────────────────────────────────────────────────────
export default async function MealPlansPage() {
  const plans = await getMealPlans();

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="MEAL PLANS"
        eyebrow={`${plans.length} plan${plans.length !== 1 ? "s" : ""} in library`}
        actions={
          <Link href="/meal-plans/new">
            <Button size="sm">
              <Plus size={13} />
              New Meal Plan
            </Button>
          </Link>
        }
      />

      <div className="p-6 pb-20 md:pb-6 flex-1">
        {plans.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <MealPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PLAN CARD ────────────────────────────────────────────────
function MealPlanCard({ plan }: { plan: MealPlan }) {
  const mealCount = plan.content?.[0]?.meals?.length ?? 0;

  return (
    <Card hoverable className="h-full group transition-[border-color,transform] duration-[220ms] hover:-translate-y-0.5">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-[18px] leading-tight truncate pr-2">
          {plan.name}
        </CardTitle>
        <Badge variant="gold">{plan.goal}</Badge>
      </CardHeader>

      <CardBody className="pt-4">
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="muted">{plan.calories_daily} cal/day</Badge>
          <Badge variant="muted">{mealCount} meals</Badge>
        </div>

        <div className="border-t border-steel pt-3 flex items-center justify-between">
          <p className="text-[11px] text-muted">By {plan.created_by}</p>
          <p className="text-[11px] text-muted">{formatDate(plan.created_at)}</p>
        </div>
      </CardBody>
    </Card>
  );
}

// ── EMPTY STATE ──────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center border border-steel border-dashed bg-chevron-pattern">
      <UtensilsCrossed size={40} className="text-steel mb-4" />
      <p className="font-display text-[36px] tracking-[0.06em] text-steel leading-none mb-3">
        NO MEAL PLANS YET
      </p>
      <p className="text-[13px] text-muted mb-6">
        Create your first meal plan to start sending to members.
      </p>
      <Link href="/meal-plans/new">
        <Button>
          <Plus size={14} />
          Create Meal Plan
        </Button>
      </Link>
    </div>
  );
}
