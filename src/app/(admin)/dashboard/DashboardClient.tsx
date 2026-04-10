"use client";

import { Card, CardLabel } from "@/components/ui/Card";
import {
  MembershipGrowthChart,
  RevenueBreakdownChart,
  PlanDistributionChart,
  WeeklyActivityChart,
} from "@/components/admin/DashboardCharts";

// ── PROPS ─────────────────────────────────────────────────────
interface DashboardChartsSectionProps {
  growthData:       { month: string; newMembers: number; churned: number }[];
  revenueByType:    { type: string; revenue: number; count: number }[];
  planDistribution: { name: string; value: number }[];
  weeklyActivity:   { day: string; plansSent: number }[];
}

// ── CHARTS SECTION (Client Component wrapper) ─────────────────
export function DashboardChartsSection({
  growthData,
  revenueByType,
  planDistribution,
  weeklyActivity,
}: DashboardChartsSectionProps) {
  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Membership Growth */}
        <Card variant="default">
          <div className="px-5 py-4 border-b border-steel">
            <CardLabel className="mb-0">Membership Growth</CardLabel>
            <p className="text-[11px] text-muted mt-0.5">New vs churned members (last 6 months)</p>
          </div>
          <div className="p-4">
            <MembershipGrowthChart data={growthData} />
          </div>
          <div className="px-5 py-2.5 border-t border-steel/50 flex gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-gold inline-block" />
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-muted">New</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-danger inline-block" />
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-muted">Churned</span>
            </div>
          </div>
        </Card>

        {/* Revenue Breakdown */}
        <Card variant="default">
          <div className="px-5 py-4 border-b border-steel">
            <CardLabel className="mb-0">Revenue Breakdown</CardLabel>
            <p className="text-[11px] text-muted mt-0.5">By subscription type</p>
          </div>
          <div className="p-4">
            <RevenueBreakdownChart data={revenueByType} />
          </div>
        </Card>

        {/* Plan Distribution */}
        <Card variant="default">
          <div className="px-5 py-4 border-b border-steel">
            <CardLabel className="mb-0">Plan Distribution</CardLabel>
            <p className="text-[11px] text-muted mt-0.5">Active subscription types</p>
          </div>
          <div className="p-5">
            <PlanDistributionChart data={planDistribution} />
          </div>
        </Card>

        {/* Weekly Activity */}
        <Card variant="default">
          <div className="px-5 py-4 border-b border-steel">
            <CardLabel className="mb-0">Weekly Activity</CardLabel>
            <p className="text-[11px] text-muted mt-0.5">Plans sent (last 7 days)</p>
          </div>
          <div className="p-4">
            <WeeklyActivityChart data={weeklyActivity} />
          </div>
        </Card>

      </div>
    </section>
  );
}
