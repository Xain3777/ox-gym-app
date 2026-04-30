import type { Metadata } from "next";
import Link from "next/link";
import {
  Plus, Send, Users, TrendingUp, TrendingDown, CreditCard,
  Dumbbell, AlertTriangle, Activity, UserPlus, Bell,
  ChevronRight, Clock, Target, Zap, ArrowUpRight, Star,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, SectionHeader, StripeDivider } from "@/components/layout/TopBar";
import { Card, CardBody, CardLabel } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { MemberRow } from "@/components/admin/MemberRow";
import { DashboardChartsSection } from "./DashboardClient";
import { getMemberStatus, formatDate, daysUntil, formatCurrency, timeAgo } from "@/lib/utils";
import type { MemberWithSub } from "@/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — OX GYM" };

// ═══════════════════════════════════════════════════════════════
// DATA FETCHING (Server Component)
// ═══════════════════════════════════════════════════════════════

interface DashboardData {
  // KPIs
  totalMembers:      number;
  activeMembers:     number;
  expiringSoon:      number;
  expired:           number;
  monthlyRevenue:    number;
  newSignups30d:     number;
  retentionRate:     number;
  plansSentMonth:    number;
  totalPlans:        number;

  // Growth data (last 6 months)
  growthData:        { month: string; newMembers: number; churned: number }[];

  // Revenue by plan type
  revenueByType:     { type: string; revenue: number; count: number }[];

  // Plan distribution
  planDistribution:  { name: string; value: number }[];

  // Weekly activity
  weeklyActivity:    { day: string; plansSent: number }[];

  // Members
  recentMembers:     MemberWithSub[];
  expiringMembers:   MemberWithSub[];
  atRiskMembers:     MemberWithSub[];

  // Activity feed
  recentActivity:    ActivityItem[];

  // Top workout plans
  topPlans:          { id: string; name: string; category: string; level: string; sendCount: number }[];

  // Feedback
  recentFeedback:    { id: string; memberName: string; rating: number; comment: string; created_at: string }[];
  avgRating:         number;
}

interface ActivityItem {
  id:        string;
  type:      "signup" | "plan_sent" | "expiring" | "expired" | "notification";
  title:     string;
  detail:    string;
  timestamp: string;
}

async function getDashboardData(): Promise<DashboardData> {
  try {
  const supabase = createServiceClient();
  const now = new Date();

  // ── Fetch all members with subscriptions ──
  const { data: members } = await supabase
    .from("members")
    .select(`*, subscription:subscriptions(*)`)
    .order("created_at", { ascending: false });

  const withSubs = (members ?? []).map((m) => ({
    ...m,
    subscription: Array.isArray(m.subscription) ? m.subscription[0] ?? null : m.subscription,
  })) as MemberWithSub[];

  // ── KPI computations ──
  const totalMembers = withSubs.length;
  let activeMembers = 0;
  let expiringSoon = 0;
  let expired = 0;
  let monthlyRevenue = 0;
  let newSignups30d = 0;

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Revenue by plan type
  const revMap: Record<string, { revenue: number; count: number }> = {
    Monthly:   { revenue: 0, count: 0 },
    Quarterly: { revenue: 0, count: 0 },
    Annual:    { revenue: 0, count: 0 },
  };

  // Plan type distribution
  const planTypeCount: Record<string, number> = {
    Monthly: 0, Quarterly: 0, Annual: 0,
  };

  withSubs.forEach((m) => {
    const status = getMemberStatus(m.subscription?.end_date ?? null);
    if (status === "active")   activeMembers++;
    if (status === "expiring") expiringSoon++;
    if (status === "expired")  expired++;

    // New signups in last 30 days
    if (new Date(m.created_at) >= thirtyDaysAgo) {
      newSignups30d++;
    }

    // Revenue from active/expiring subscriptions
    if (m.subscription && (status === "active" || status === "expiring")) {
      const price = m.subscription.price ?? 0;
      const typeLabel = m.subscription.plan_type.charAt(0).toUpperCase() + m.subscription.plan_type.slice(1);
      monthlyRevenue += price;

      if (revMap[typeLabel]) {
        revMap[typeLabel].revenue += price;
        revMap[typeLabel].count++;
      }

      if (planTypeCount[typeLabel] !== undefined) {
        planTypeCount[typeLabel]++;
      }
    }
  });

  const retentionRate = totalMembers > 0
    ? Math.round(((activeMembers + expiringSoon) / totalMembers) * 100)
    : 0;

  // ── Plans sent this month ──
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { count: plansSent } = await supabase
    .from("plan_sends")
    .select("*", { count: "exact", head: true })
    .gte("sent_at", startOfMonth.toISOString())
    .eq("status", "sent");

  // ── Total workout plans ──
  const { count: totalPlans } = await supabase
    .from("workout_plans")
    .select("*", { count: "exact", head: true });

  // ── Growth data (last 6 months) ──
  const growthData: { month: string; newMembers: number; churned: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = d.toLocaleDateString("en-US", { month: "short" });

    const newInMonth = withSubs.filter((m) => {
      const created = new Date(m.created_at);
      return created >= d && created <= monthEnd;
    }).length;

    const churnedInMonth = withSubs.filter((m) => {
      if (!m.subscription?.end_date) return false;
      const endDate = new Date(m.subscription.end_date);
      return endDate >= d && endDate <= monthEnd && getMemberStatus(m.subscription.end_date) === "expired";
    }).length;

    growthData.push({ month: monthLabel, newMembers: newInMonth, churned: churnedInMonth });
  }

  // ── Weekly plan send activity (last 7 days) ──
  const weeklyActivity: { day: string; plansSent: number }[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const { data: recentSends } = await supabase
    .from("plan_sends")
    .select("sent_at")
    .gte("sent_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .eq("status", "sent");

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayLabel = dayNames[d.getDay()];
    const count = (recentSends ?? []).filter((s) => {
      const sd = new Date(s.sent_at);
      return sd.toDateString() === d.toDateString();
    }).length;
    weeklyActivity.push({ day: dayLabel, plansSent: count });
  }

  // ── Top workout plans (by send count) ──
  const { data: allPlans } = await supabase
    .from("workout_plans")
    .select("id, name, category, level");

  const { data: allSends } = await supabase
    .from("plan_sends")
    .select("plan_id")
    .eq("plan_type", "workout")
    .eq("status", "sent");

  const sendCounts: Record<string, number> = {};
  (allSends ?? []).forEach((s) => {
    sendCounts[s.plan_id] = (sendCounts[s.plan_id] || 0) + 1;
  });

  const topPlans = (allPlans ?? [])
    .map((p) => ({ ...p, sendCount: sendCounts[p.id] || 0 }))
    .sort((a, b) => b.sendCount - a.sendCount)
    .slice(0, 5);

  // ── Recent activity feed ──
  const activity: ActivityItem[] = [];

  // Recent signups
  withSubs.slice(0, 5).forEach((m) => {
    activity.push({
      id:        `signup-${m.id}`,
      type:      "signup",
      title:     "New member signed up",
      detail:    m.full_name,
      timestamp: m.created_at,
    });
  });

  // Recent plan sends
  const { data: latestSends } = await supabase
    .from("plan_sends")
    .select("*, member:members(full_name), plan:workout_plans(name)")
    .order("sent_at", { ascending: false })
    .limit(5);

  (latestSends ?? []).forEach((s: any) => {
    activity.push({
      id:        `send-${s.id}`,
      type:      "plan_sent",
      title:     "Workout plan assigned",
      detail:    `${s.member?.full_name ?? "Member"} → ${s.plan?.name ?? "Plan"}`,
      timestamp: s.sent_at,
    });
  });

  // Recent notifications
  const { data: latestNotifs } = await supabase
    .from("notifications")
    .select("id, title, type, sent_at")
    .order("sent_at", { ascending: false })
    .limit(3);

  (latestNotifs ?? []).forEach((n) => {
    activity.push({
      id:        `notif-${n.id}`,
      type:      "notification",
      title:     n.type === "announcement" ? "Announcement sent" : "Notification sent",
      detail:    n.title,
      timestamp: n.sent_at,
    });
  });

  // Sort all activity by timestamp
  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // ── Members lists ──
  const expiringMembers = withSubs
    .filter((m) => getMemberStatus(m.subscription?.end_date ?? null) === "expiring")
    .slice(0, 6);

  const recentMembers = withSubs.slice(0, 6);

  // At-risk: expired members who were recently active
  const atRiskMembers = withSubs
    .filter((m) => getMemberStatus(m.subscription?.end_date ?? null) === "expired")
    .slice(0, 5);

  // ── Feedback (live) ──
  // The feedback table stores ratings + comments as JSONB maps
  // (e.g. ratings: { coach: 5, equipment: 4 }). Average each row's
  // ratings, pick the first non-empty comment as the representative one.
  const { data: feedbackRows } = await supabase
    .from("feedback")
    .select("id, submitted_at, ratings, comments, member:members(full_name)")
    .order("submitted_at", { ascending: false })
    .limit(8);

  const recentFeedback = (feedbackRows ?? []).map((fb: any) => {
    const ratingValues = Object.values(fb.ratings ?? {}).filter(
      (v): v is number => typeof v === "number",
    );
    const avg = ratingValues.length
      ? ratingValues.reduce((s, n) => s + n, 0) / ratingValues.length
      : 0;
    const commentValues = Object.values(fb.comments ?? {}).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    return {
      id:         fb.id as string,
      memberName: (fb.member?.full_name as string | undefined) ?? "Member",
      rating:     Math.round(avg),
      comment:    commentValues[0] ?? "",
      created_at: fb.submitted_at as string,
    };
  });

  const avgRating = recentFeedback.length > 0
    ? Math.round((recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length) * 10) / 10
    : 0;

  return {
    totalMembers,
    activeMembers,
    expiringSoon,
    expired,
    monthlyRevenue,
    newSignups30d,
    retentionRate,
    plansSentMonth: plansSent ?? 0,
    totalPlans: totalPlans ?? 0,
    growthData,
    revenueByType: Object.entries(revMap).map(([type, d]) => ({ type, ...d })),
    planDistribution: Object.entries(planTypeCount).map(([name, value]) => ({ name, value })),
    weeklyActivity,
    recentMembers,
    expiringMembers,
    atRiskMembers,
    recentActivity: activity.slice(0, 10),
    topPlans,
    recentFeedback,
    avgRating,
  };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return {
      totalMembers: 0,
      activeMembers: 0,
      expiringSoon: 0,
      expired: 0,
      monthlyRevenue: 0,
      newSignups30d: 0,
      retentionRate: 0,
      plansSentMonth: 0,
      totalPlans: 0,
      growthData: [],
      revenueByType: [],
      planDistribution: [],
      weeklyActivity: [],
      recentMembers: [],
      expiringMembers: [],
      atRiskMembers: [],
      recentActivity: [],
      topPlans: [],
      recentFeedback: [],
      avgRating: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default async function DashboardPage() {
  const data = await getDashboardData();

  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  return (
    <div className="flex flex-col min-h-full">

      {/* ── TOP BAR ── */}
      <TopBar
        title="لوحة التحكم"
        eyebrow={today}
      />
      <StripeDivider />

      {/* ── PAGE CONTENT ── */}
      <div className="flex-1 p-5 sm:p-8 space-y-8 pb-20 md:pb-8 max-w-[1400px] mx-auto w-full">

        {/* ═══ SECTION 1: KPI CARDS ═══ */}
        <section>
          <SectionHeader label="نظرة عامة" />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

            <KPICard
              label="الأعضاء النشطون"
              value={data.activeMembers}
              icon={Users}
              trend={data.activeMembers > 0 ? "up" : "neutral"}
              trendText="مسجّل"
            />
            <KPICard
              label="الإيرادات الشهرية"
              value={`€${data.monthlyRevenue.toLocaleString()}`}
              icon={CreditCard}
              trend="up"
              trendText="هذه الفترة"
              accent="gold"
            />
            <KPICard
              label="تسجيلات جديدة"
              value={data.newSignups30d}
              icon={UserPlus}
              trend={data.newSignups30d > 0 ? "up" : "neutral"}
              trendText="آخر ٣٠ يوم"
            />
            <KPICard
              label="معدل الاحتفاظ"
              value={`${data.retentionRate}%`}
              icon={Target}
              trend={data.retentionRate >= 80 ? "up" : data.retentionRate >= 50 ? "neutral" : "down"}
              trendText="من الأعضاء"
              accent={data.retentionRate < 50 ? "danger" : "gold"}
            />
            <KPICard
              label="البرامج المرسلة"
              value={data.plansSentMonth}
              icon={Send}
              trend="neutral"
              trendText="هذا الشهر"
            />
            <KPICard
              label="ينتهي قريباً"
              value={data.expiringSoon}
              icon={AlertTriangle}
              trend={data.expiringSoon > 0 ? "down" : "neutral"}
              trendText="خلال ٧ أيام"
              accent={data.expiringSoon > 0 ? "danger" : "gold"}
            />
          </div>
        </section>

        {/* ═══ SECTION 2: EXPIRING ALERT ═══ */}
        {data.expiringMembers.length > 0 && (
          <Alert
            variant="warning"
            title={`${data.expiringMembers.length} اشتراك ينتهي خلال ٧ أيام`}
            description={
              data.expiringMembers.slice(0, 3).map((m) => m.full_name).join(", ") +
              (data.expiringMembers.length > 3 ? ` +${data.expiringMembers.length - 3} more` : "")
            }
          />
        )}

        {/* ═══ SECTION 3: CHARTS (Client Component) ═══ */}
        <DashboardChartsSection
          growthData={data.growthData}
          revenueByType={data.revenueByType}
          planDistribution={data.planDistribution}
          weeklyActivity={data.weeklyActivity}
        />

        {/* ═══ SECTION 4: THREE-COLUMN GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Column A: At-Risk Members ── */}
          <Card variant="default" className="lg:col-span-1">
            <div className="px-5 py-4 border-b border-steel flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-danger" />
                <CardLabel className="mb-0">تنبيهات الاحتفاظ</CardLabel>
              </div>
              <Badge variant="danger">{data.expired} معرّض</Badge>
            </div>
            <CardBody className="p-0">
              {data.atRiskMembers.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[12px] text-muted">لا يوجد أعضاء معرّضون</p>
                </div>
              ) : (
                <div className="divide-y divide-steel/50">
                  {data.atRiskMembers.map((m) => (
                    <Link
                      key={m.id}
                      href={`/members/${m.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gunmetal transition-colors group"
                    >
                      <Avatar name={m.full_name} photoUrl={m.photo_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white truncate">{m.full_name}</p>
                        <p className="text-[11px] text-danger">
                          منتهي {m.subscription?.end_date ? timeAgo(m.subscription.end_date) : ""}
                        </p>
                      </div>
                      <ChevronRight size={12} className="text-steel group-hover:text-gold transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
              {data.atRiskMembers.length > 0 && (
                <div className="px-5 py-3 border-t border-steel">
                  <Link href="/members?filter=expired" className="text-[11px] font-mono tracking-[0.1em] uppercase text-gold hover:text-gold-high transition-colors">
                    ← عرض جميع المنتهية
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── Column B: Recent Activity Feed ── */}
          <Card variant="default" className="lg:col-span-1">
            <div className="px-5 py-4 border-b border-steel flex items-center gap-2">
              <Activity size={14} className="text-gold" />
              <CardLabel className="mb-0">النشاط الأخير</CardLabel>
            </div>
            <CardBody className="p-0">
              {data.recentActivity.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[12px] text-muted">لا يوجد نشاط حديث</p>
                </div>
              ) : (
                <div className="divide-y divide-steel/50 max-h-[360px] overflow-y-auto">
                  {data.recentActivity.map((item) => (
                    <ActivityRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── Column C: Top Workout Plans ── */}
          <Card variant="default" className="lg:col-span-1">
            <div className="px-5 py-4 border-b border-steel flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gold" />
                <CardLabel className="mb-0">أفضل برامج التمارين</CardLabel>
              </div>
              <Badge variant="gold">{data.totalPlans} إجمالي</Badge>
            </div>
            <CardBody className="p-0">
              {data.topPlans.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[12px] text-muted">لم يتم إنشاء برامج بعد</p>
                  <Link href="/plans/new" className="mt-2 inline-block">
                    <Button size="sm" variant="secondary">
                      <Plus size={13} />
                      إنشاء برنامج
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-steel/50">
                  {data.topPlans.map((plan, i) => (
                    <Link
                      key={plan.id}
                      href={`/plans/${plan.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gunmetal transition-colors group"
                    >
                      <div className="w-7 h-7 bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-[10px] text-gold font-bold">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white truncate">{plan.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted">{plan.category}</span>
                          <span className="text-[8px] text-steel">·</span>
                          <span className="text-[10px] text-muted capitalize">{plan.level}</span>
                        </div>
                      </div>
                      <Badge variant={plan.sendCount > 0 ? "gold" : "muted"}>
                        {plan.sendCount} مرسل
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
              <div className="px-5 py-3 border-t border-steel">
                <Link href="/plans" className="text-[11px] font-mono tracking-[0.1em] uppercase text-gold hover:text-gold-high transition-colors">
                  ← جميع البرامج
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ═══ SECTION 5: MEMBER FEEDBACK ═══ */}
        <section>
          <SectionHeader label="آراء الأعضاء" />
          <Card variant="default">
            <div className="px-5 py-4 border-b border-steel flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-gold" />
                <CardLabel className="mb-0">التقييمات والمراجعات</CardLabel>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[20px] text-gold leading-none">{data.avgRating}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={12}
                      className={s <= Math.round(data.avgRating) ? "text-gold fill-gold" : "text-steel"}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-muted ml-1">({data.recentFeedback.length})</span>
              </div>
            </div>
            <CardBody className="p-0">
              {data.recentFeedback.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[12px] text-muted">لا توجد آراء بعد</p>
                </div>
              ) : (
                <div className="divide-y divide-steel/50">
                  {data.recentFeedback.map((fb) => (
                    <div key={fb.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] text-offwhite font-medium">{fb.memberName}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={10}
                              className={s <= fb.rating ? "text-gold fill-gold" : "text-steel"}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[12px] text-muted">{fb.comment}</p>
                      <p className="text-[10px] text-slate mt-1">{timeAgo(fb.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </section>

        {/* ═══ SECTION 6: MEMBER LISTS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Expiring Soon */}
          {data.expiringMembers.length > 0 && (
            <section>
              <SectionHeader label="ينتهي قريباً">
                <Link
                  href="/members?filter=expiring"
                  className="font-mono text-[10px] tracking-[0.12em] uppercase text-gold hover:text-gold-high transition-colors"
                >
                  ← عرض الكل
                </Link>
              </SectionHeader>
              <div className="space-y-[2px]">
                {data.expiringMembers.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Members */}
          <section>
            <SectionHeader label="الأعضاء الجدد">
              <Link
                href="/members"
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-gold hover:text-gold-high transition-colors"
              >
                ← جميع الأعضاء
              </Link>
            </SectionHeader>
            {data.recentMembers.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-[2px]">
                {data.recentMembers.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ═══ SECTION 6: QUICK ACTIONS ═══ */}
        <section>
          <SectionHeader label="إجراءات سريعة" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickAction href="/members/new" icon={UserPlus} label="إضافة عضو" />
            <QuickAction href="/plans/new" icon={Dumbbell} label="إنشاء برنامج" />
            <QuickAction href="/plans/send" icon={Send} label="تعيين برنامج" />
            <QuickAction href="/notifications" icon={Bell} label="إرسال إعلان" />
          </div>
        </section>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ── KPI CARD ─────────────────────────────────────────────────
function KPICard({
  label, value, icon: Icon, trend, trendText, accent = "gold",
}: {
  label:      string;
  value:      string | number;
  icon:       React.ElementType;
  trend:      "up" | "down" | "neutral";
  trendText:  string;
  accent?:    "gold" | "danger";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : ArrowUpRight;
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-muted";
  const valueColor = accent === "danger" ? "text-danger" : "text-gold";

  return (
    <Card variant="stat" className="p-5 sm:p-6 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between mb-4">
        <CardLabel className="mb-0 text-ghost">{label}</CardLabel>
        <div className={cn(
          "w-8 h-8 flex items-center justify-center flex-shrink-0",
          accent === "danger" ? "bg-danger/10 border border-danger/20" : "bg-gold/10 border border-gold/20",
        )}>
          <Icon size={14} className={accent === "danger" ? "text-danger" : "text-gold"} />
        </div>
      </div>
      <div>
        <p className={cn(
          "font-display text-[32px] sm:text-[38px] leading-none tracking-[0.02em] animate-count-up",
          valueColor,
        )}>
          {value}
        </p>
        <div className={cn("flex items-center gap-1.5 mt-2.5", trendColor)}>
          <TrendIcon size={11} />
          <span className="text-[11px]">{trendText}</span>
        </div>
      </div>
    </Card>
  );
}

// ── ACTIVITY ROW ─────────────────────────────────────────────
function ActivityRow({ item }: { item: ActivityItem }) {
  const iconMap = {
    signup:       { icon: UserPlus,      color: "text-success", bg: "bg-success/10 border-success/20" },
    plan_sent:    { icon: Send,          color: "text-gold",    bg: "bg-gold/10 border-gold/20" },
    expiring:     { icon: AlertTriangle, color: "text-gold",    bg: "bg-gold/10 border-gold/20" },
    expired:      { icon: AlertTriangle, color: "text-danger",  bg: "bg-danger/10 border-danger/20" },
    notification: { icon: Bell,          color: "text-muted",   bg: "bg-steel/30 border-steel" },
  };

  const { icon: Icon, color, bg } = iconMap[item.type];

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className={cn("w-7 h-7 border flex items-center justify-center flex-shrink-0 mt-0.5", bg)}>
        <Icon size={12} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-offwhite">{item.title}</p>
        <p className="text-[11px] text-muted truncate">{item.detail}</p>
      </div>
      <span className="text-[10px] text-slate whitespace-nowrap flex-shrink-0 mt-0.5">
        {timeAgo(item.timestamp)}
      </span>
    </div>
  );
}

// ── QUICK ACTION BUTTON ──────────────────────────────────────
function QuickAction({
  href, icon: Icon, label,
}: {
  href:  string;
  icon:  React.ElementType;
  label: string;
}) {
  return (
    <Link href={href}>
      <Card
        variant="ghost"
        hoverable
        className="flex flex-col items-center justify-center gap-3 py-6 px-4 text-center hover:border-gold/30 hover:bg-gold/5 transition-all duration-mid"
      >
        <div className="w-11 h-11 bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Icon size={18} className="text-gold" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted group-hover:text-offwhite transition-colors">
          {label}
        </span>
      </Card>
    </Link>
  );
}

// ── EMPTY STATE ──────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="
      flex flex-col items-center justify-center
      py-16 px-6 text-center
      border border-steel border-dashed
      bg-chevron-pattern
    ">
      <p className="font-display text-[36px] tracking-[0.06em] text-steel leading-none mb-3">
        لا يوجد أعضاء بعد
      </p>
      <p className="text-[13px] text-muted mb-5 max-w-prose">
        أضف أول عضو للبدء.
      </p>
      <Link href="/members/new">
        <Button>
          <Plus size={14} />
          أضف أول عضو
        </Button>
      </Link>
    </div>
  );
}
