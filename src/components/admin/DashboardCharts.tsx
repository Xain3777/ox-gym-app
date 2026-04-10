"use client";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

// ── OX BRAND COLORS ──────────────────────────────────────────
const COLORS = {
  gold:      "#F5C100",
  goldDim:   "#8A6D00",
  gold20:    "rgba(245,193,0,0.20)",
  gold10:    "rgba(245,193,0,0.10)",
  red:       "#D42B2B",
  green:     "#5CC45C",
  steel:     "#333333",
  slate:     "#555555",
  muted:     "#777777",
  charcoal:  "#111111",
  iron:      "#1A1A1A",
  void:      "#0A0A0A",
  offwhite:  "#F0EDE6",
};

const PIE_COLORS = ["#F5C100", "#FFD740", "#C49A00", "#8A6D00", "#D42B2B"];

// ── CUSTOM TOOLTIP ───────────────────────────────────────────
function OxTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-charcoal border border-steel px-3 py-2 shadow-lg">
      <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-muted mb-1">
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-[12px] font-medium" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── SPARKLINE (mini chart for stat cards) ────────────────────
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = COLORS.gold, height = 32 }: SparklineProps) {
  const chartData = data.map((value, i) => ({ value, i }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── MEMBERSHIP GROWTH CHART ──────────────────────────────────
interface GrowthDataPoint {
  month: string;
  newMembers: number;
  churned: number;
}

interface MembershipGrowthChartProps {
  data: GrowthDataPoint[];
}

export function MembershipGrowthChart({ data }: MembershipGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.red} stopOpacity={0.15} />
            <stop offset="100%" stopColor={COLORS.red} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.steel} opacity={0.3} />
        <XAxis
          dataKey="month"
          tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "DM Mono" }}
          axisLine={{ stroke: COLORS.steel }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "DM Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<OxTooltip />} />
        <Area
          type="monotone"
          dataKey="newMembers"
          name="New Members"
          stroke={COLORS.gold}
          strokeWidth={2}
          fill="url(#goldGrad)"
          dot={false}
          activeDot={{ r: 4, fill: COLORS.gold, stroke: COLORS.void, strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="churned"
          name="Churned"
          stroke={COLORS.red}
          strokeWidth={1.5}
          fill="url(#redGrad)"
          dot={false}
          activeDot={{ r: 3, fill: COLORS.red, stroke: COLORS.void, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── REVENUE BREAKDOWN CHART ──────────────────────────────────
interface RevenueDataPoint {
  type: string;
  revenue: number;
  count: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export function RevenueBreakdownChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.steel} opacity={0.3} />
        <XAxis
          dataKey="type"
          tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "DM Mono" }}
          axisLine={{ stroke: COLORS.steel }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "DM Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<OxTooltip />} />
        <Bar dataKey="revenue" name="Revenue" fill={COLORS.gold} radius={[2, 2, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── PLAN DISTRIBUTION DONUT ──────────────────────────────────
interface PlanDistItem {
  name: string;
  value: number;
}

interface PlanDistributionChartProps {
  data: PlanDistItem[];
}

export function PlanDistributionChart({ data }: PlanDistributionChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
            stroke={COLORS.void}
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 flex-shrink-0"
                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-[12px] text-offwhite">{item.name}</span>
            </div>
            <span className="font-mono text-[11px] text-muted">
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WEEKLY ACTIVITY BARS ─────────────────────────────────────
interface WeeklyActivityPoint {
  day: string;
  plansSent: number;
}

interface WeeklyActivityChartProps {
  data: WeeklyActivityPoint[];
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="day"
          tick={{ fill: COLORS.muted, fontSize: 9, fontFamily: "DM Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<OxTooltip />} />
        <Bar dataKey="plansSent" name="Plans Sent" fill={COLORS.gold} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
