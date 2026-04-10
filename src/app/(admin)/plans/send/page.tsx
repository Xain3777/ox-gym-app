import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, StripeDivider } from "@/components/layout/TopBar";
import { SendPlanFlow } from "@/components/admin/SendPlanFlow";
import type { MemberWithSub, WorkoutPlan } from "@/types";

export const metadata: Metadata = { title: "Send Plan" };

async function getData() {
  try {
    const supabase = createServiceClient();

    const [membersRes, plansRes] = await Promise.all([
      supabase
        .from("members")
        .select("*, subscription:subscriptions(*)")
        .neq("status", "expired")
        .order("full_name"),
      supabase
        .from("workout_plans")
        .select("*")
        .order("name"),
    ]);

    const members = (membersRes.data ?? []).map((m: any) => ({
      ...m,
      subscription: Array.isArray(m.subscription) ? m.subscription[0] ?? null : m.subscription,
    })) as MemberWithSub[];

    const plans = (plansRes.data ?? []) as WorkoutPlan[];

    return { members, plans };
  } catch (error) {
    console.error("Failed to fetch send plan data:", error);
    return { members: [] as MemberWithSub[], plans: [] as WorkoutPlan[] };
  }
}

export default async function SendPlanPage() {
  const { members, plans } = await getData();

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="SEND PLAN"
        eyebrow="Plans"
        actions={
          <Link
            href="/plans"
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted hover:text-offwhite transition-colors"
          >
            <ArrowLeft size={12} />
            Back
          </Link>
        }
      />
      <StripeDivider thin />

      <div className="flex-1 p-6 pb-20 md:pb-6">
        <Suspense fallback={<div className="text-muted text-[13px]">Loading...</div>}>
          <SendPlanFlow members={members} plans={plans} />
        </Suspense>
      </div>
    </div>
  );
}
