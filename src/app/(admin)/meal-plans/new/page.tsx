import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TopBar, StripeDivider } from "@/components/layout/TopBar";
import { CreateMealPlanForm } from "@/components/admin/CreateMealPlanForm";

export const metadata: Metadata = { title: "New Meal Plan" };

export default function NewMealPlanPage() {
  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="CREATE MEAL PLAN"
        eyebrow="Meal Plans"
        actions={
          <Link
            href="/meal-plans"
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted hover:text-offwhite transition-colors"
          >
            <ArrowLeft size={12} />
            Back
          </Link>
        }
      />
      <StripeDivider thin />
      <div className="flex-1 p-6 pb-20 md:pb-6">
        <CreateMealPlanForm />
      </div>
    </div>
  );
}
