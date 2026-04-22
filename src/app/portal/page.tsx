"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import {
  OxDumbbell, OxFork, OxBag, OxClock, OxAlert,
  OxTarget, OxFlame, OxHeart, OxShield,
} from "@/components/icons/OxIcons";
import { daysUntilExpiry, getDetailedStatus } from "@/lib/subscription";
import type { DetailedSubStatus } from "@/lib/subscription";

interface UserData {
  name: string;
  firstName: string;
  subscription: {
    plan: string;
    status: DetailedSubStatus;
    daysLeft: number;
    endDate: string;
    rawDays: number;
  } | null;
  workout: { name: string; subtitle: string; exerciseCount: number } | null;
  hasLoggedProgress: boolean;
  hasMealPlan: boolean;
  hasProfileFilled: boolean;
  hasOrderedMeal: boolean;
}

// ── Smart Suggestion config ───────────────────────────────────
interface Suggestion {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  href: string;
  accent: string;
  border: string;
  stripe: string;
}

function buildSuggestions(data: UserData): Suggestion[] {
  const all: Suggestion[] = [
    {
      id: "profile",
      icon: <OxShield size={20} className="text-purple-400" />,
      label: "أكمل ملفك الصحي",
      sub: "أضف إصاباتك وأهدافك ليصمم مدربك برنامجاً مخصصاً",
      href: "/portal/profile",
      accent: "bg-purple-950/40 border-purple-500/20 hover:bg-purple-900/30 hover:border-purple-400/30",
      border: "border-purple-500/20",
      stripe: "repeating-linear-gradient(90deg,#a855f7 0px,#a855f7 6px,transparent 6px,transparent 12px)",
    },
    {
      id: "workout",
      icon: <OxDumbbell size={20} className="text-gold" />,
      label: "ابدأ تمرين اليوم",
      sub: "سجّل جلستك وتابع تقدمك اليومي",
      href: "/portal/workouts",
      accent: "bg-yellow-950/30 border-yellow-500/20 hover:bg-yellow-900/20 hover:border-yellow-400/30",
      border: "border-yellow-500/20",
      stripe: "repeating-linear-gradient(90deg,#F5C100 0px,#F5C100 6px,transparent 6px,transparent 12px)",
    },
    {
      id: "meal",
      icon: <OxFork size={20} className="text-emerald-400" />,
      label: "اطلب وجبتك",
      sub: "وجبات غذائية مصممة لدعم هدفك",
      href: "/portal/order-meal",
      accent: "bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-900/30 hover:border-emerald-400/30",
      border: "border-emerald-500/20",
      stripe: "repeating-linear-gradient(90deg,#10b981 0px,#10b981 6px,transparent 6px,transparent 12px)",
    },
    {
      id: "progress",
      icon: <OxTarget size={20} className="text-sky-400" />,
      label: "راجع تقدمك",
      sub: "شاهد إحصائياتك وسجل تمارينك المكتملة",
      href: "/portal/progress",
      accent: "bg-sky-950/40 border-sky-500/20 hover:bg-sky-900/30 hover:border-sky-400/30",
      border: "border-sky-500/20",
      stripe: "repeating-linear-gradient(90deg,#38bdf8 0px,#38bdf8 6px,transparent 6px,transparent 12px)",
    },
    {
      id: "feedback",
      icon: <OxHeart size={20} className="text-rose-400" />,
      label: "شاركنا رأيك",
      sub: "ساعدنا على تحسين تجربتك في الصالة",
      href: "/portal/more",
      accent: "bg-rose-950/40 border-rose-500/20 hover:bg-rose-900/30 hover:border-rose-400/30",
      border: "border-rose-500/20",
      stripe: "repeating-linear-gradient(90deg,#fb7185 0px,#fb7185 6px,transparent 6px,transparent 12px)",
    },
    {
      id: "renew",
      icon: <OxFlame size={20} className="text-orange-400" />,
      label: "جدّد اشتراكك",
      sub: "لا تنقطع رحلتك — اختر خطة تناسبك",
      href: "/renew",
      accent: "bg-orange-950/40 border-orange-500/20 hover:bg-orange-900/30 hover:border-orange-400/30",
      border: "border-orange-500/20",
      stripe: "repeating-linear-gradient(90deg,#fb923c 0px,#fb923c 6px,transparent 6px,transparent 12px)",
    },
  ];

  // Priority order based on what the user is missing
  const priority: string[] = [];
  if (!data.hasProfileFilled)  priority.push("profile");
  if (!data.workout)           priority.push("workout");
  if (!data.hasMealPlan)       priority.push("meal");
  if (!data.hasLoggedProgress) priority.push("progress");
  if (!data.subscription || data.subscription.rawDays < 7) priority.push("renew");
  priority.push("feedback");

  // Return top 3 unique
  const seen = new Set<string>();
  const result: Suggestion[] = [];
  for (const id of priority) {
    if (!seen.has(id)) { seen.add(id); const s = all.find((a) => a.id === id); if (s) result.push(s); }
    if (result.length === 3) break;
  }
  return result;
}

export default function PortalHome() {
  const { t } = useTranslation();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Single member fetch
        const { data: member } = await supabase
          .from("members")
          .select("id, full_name, status, date_of_birth, illnesses, injuries")
          .eq("auth_id", user.id)
          .single();

        if (!member) return;

        const memberId = member.id;

        // Parallel fetches
        const [subRes, planSendRes, mealSendRes, logRes, mealOrderRes] = await Promise.all([
          supabase.from("subscriptions").select("plan_type, end_date, status")
            .eq("member_id", memberId).eq("status", "active")
            .order("end_date", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("plan_sends").select("plan_id").eq("member_id", memberId)
            .eq("plan_type", "workout").eq("status", "sent")
            .order("sent_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("plan_sends").select("plan_id").eq("member_id", memberId)
            .eq("plan_type", "meal").eq("status", "sent")
            .order("sent_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("workout_logs").select("id").eq("member_id", memberId).limit(1).maybeSingle(),
          supabase.from("meal_orders").select("id").eq("member_id", memberId).limit(1).maybeSingle(),
        ]);

        const sub = subRes.data;
        let workout = null;

        if (planSendRes.data?.plan_id) {
          const { data: plan } = await supabase.from("workout_plans")
            .select("name, category, content").eq("id", planSendRes.data.plan_id).single();
          if (plan) {
            const content = plan.content as Array<{ exercises?: unknown[] }>;
            workout = {
              name: plan.name,
              subtitle: plan.category ?? "",
              exerciseCount: content?.[0]?.exercises ? (content[0].exercises as unknown[]).length : 0,
            };
          }
        }

        const rawDays = sub ? daysUntilExpiry(sub.end_date) : -999;
        const status  = sub ? getDetailedStatus(sub.end_date) : "locked";

        const fullName  = member.full_name ?? "";
        const firstName = fullName.split(" ")[0] ?? "";

        const hasProfileFilled = !!(member.date_of_birth ||
          (member.illnesses?.length && !member.illnesses.includes("None")) ||
          (member.injuries?.length && !member.injuries.includes("None")));

        setData({
          name: fullName,
          firstName,
          subscription: sub ? {
            plan: sub.plan_type,
            status: status as DetailedSubStatus,
            daysLeft: Math.max(0, rawDays),
            rawDays,
            endDate: new Date(sub.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          } : null,
          workout,
          hasLoggedProgress: !!logRes.data,
          hasMealPlan: !!mealSendRes.data,
          hasProfileFilled,
          hasOrderedMeal: !!mealOrderRes.data,
        });
      } catch {
        // fallback — show skeleton state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const subStatus = data?.subscription?.status ?? "locked";
  const isExpiring = subStatus === "expiring";
  const isGrace    = subStatus === "grace";
  const isExpired  = !data?.subscription || subStatus === "locked";
  const rawDays    = data?.subscription?.rawDays ?? -999;
  const suggestions = data ? buildSuggestions(data) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/40 text-[14px]">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="absolute top-6 -left-4 w-24 h-32 opacity-50 pointer-events-none select-none z-0">
        <Image src="/fig-charge.png" alt="" fill className="object-contain object-left-top" unoptimized />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10 space-y-5">

        {/* ── Expiry notice (dismissible) ── */}
        {isExpiring && !noticeDismissed && (
          <section className="relative bg-gold/[0.07] border border-gold/25 p-4 flex items-start gap-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-50" />
            <OxAlert size={18} className="text-gold flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-gold text-[14px] font-semibold leading-snug">
                {data!.subscription!.daysLeft === 1
                  ? "عضويتك ستنتهي غداً 🤝"
                  : `عضويتك ستنتهي خلال ${data!.subscription!.daysLeft} أيام`}
              </p>
              <p className="text-white/40 text-[12px] mt-1 leading-relaxed">
                ننصحك بالتجديد مسبقاً حتى لا تنقطع رحلتك معنا.
              </p>
            </div>
            <button onClick={() => setNoticeDismissed(true)}
              className="text-white/20 hover:text-white/50 text-[18px] leading-none flex-shrink-0 transition-colors" aria-label="إغلاق">
              ×
            </button>
          </section>
        )}

        {/* ── Grace-period notice ── */}
        {isGrace && (
          <section className="relative bg-danger/[0.06] border border-danger/20 p-4 flex items-start gap-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-danger/30" />
            <OxAlert size={18} className="text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-danger text-[14px] font-semibold leading-snug">انتهى اشتراكك</p>
              <p className="text-white/40 text-[12px] mt-1 leading-relaxed">
                {rawDays === -1
                  ? "لا يزال بإمكانك الوصول لمدة يوم واحد إضافي."
                  : "لا يزال بإمكانك الوصول لمدة يومين إضافيين."}
                {" "}تفضّل بزيارة الاستقبال للتجديد.
              </p>
            </div>
          </section>
        )}

        {/* ── Greeting ── */}
        <section className="relative flex items-center justify-between">
          <div>
            <p className="text-white/40 text-[11px] font-mono uppercase tracking-[0.16em] mb-0.5">
              {t("portal.from")} OX GYM
            </p>
            <h1 className="text-gold font-display text-[32px] tracking-wider leading-none mt-1">
              {t("portal.welcome")}
              {data?.firstName ? `، ${data.firstName}` : ""}
            </h1>
            {data?.subscription && !isGrace && !isExpired && (
              <p className="text-white/30 text-[12px] mt-1 font-mono">
                {t("portal.subscriptionActive")} · {data.subscription.plan}
              </p>
            )}
            {isExpired && (
              <p className="text-danger/60 text-[12px] mt-1 font-mono tracking-wide">
                غير مشترك
              </p>
            )}
          </div>
          <Image src="/ox-logo.png" alt="OX GYM" width={120} height={120} className="w-14 h-14 object-contain" unoptimized />
        </section>

        {/* ── Plan / Subscription card ── */}
        {isExpired ? (
          /* Not subscribed state */
          <section className="relative bg-white/[0.03] border border-white/[0.08] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[6px] overflow-hidden">
              <div className="w-full h-full danger-tape-thin opacity-20" />
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <OxClock size={22} className="text-white/25" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-[16px] font-semibold leading-snug">لا يوجد اشتراك نشط</p>
                  <p className="text-white/35 text-[13px] mt-1 leading-relaxed">
                    انضم الآن للوصول إلى برامج التمرين والتغذية وتتبع تقدمك.
                  </p>
                </div>
              </div>

              {/* Pricing hint */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "شهري", price: "250 ر.س" },
                  { label: "ربع سنوي", price: "650 ر.س" },
                  { label: "سنوي", price: "2,200 ر.س" },
                ].map(({ label, price }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                    <p className="text-white/50 text-[11px] font-mono uppercase tracking-wider">{label}</p>
                    <p className="text-gold text-[14px] font-bold mt-1">{price}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/renew"
                className="mt-4 flex items-center justify-center gap-2 w-full bg-gold hover:bg-yellow-400 text-[#0A0A0A] font-bold text-[15px] py-3.5 transition-all duration-200 uppercase tracking-widest"
              >
                اشترك الآن
              </Link>

              <p className="text-white/20 text-[12px] text-center mt-3">
                تواصل مع الاستقبال أو اضغط الزر أعلاه لاختيار خطتك
              </p>
            </div>
          </section>
        ) : (
          /* Active / expiring subscription */
          <section className={cn(
            "relative p-5 flex items-center justify-between border overflow-hidden",
            isGrace ? "bg-danger/[0.08] border-danger/20"
              : isExpiring ? "bg-gold/[0.06] border-gold/20"
              : "bg-white/[0.04] border-white/[0.06]"
          )}>
            <div className="absolute top-0 left-0 right-0 h-[6px] overflow-hidden">
              <div className="w-full h-full danger-tape-thin opacity-40" />
            </div>
            <div className="flex items-center gap-3">
              {(isExpiring || isGrace) ? (
                <OxAlert size={20} className={isGrace ? "text-danger" : "text-gold"} />
              ) : (
                <OxClock size={20} className="text-gold" />
              )}
              <div>
                <p className={cn("text-[16px] font-semibold",
                  isGrace ? "text-danger" : isExpiring ? "text-gold" : "text-white"
                )}>
                  {isGrace
                    ? "مهلة الوصول نشطة"
                    : `${t("portal.endsIn")} ${data?.subscription?.daysLeft ?? 0} ${t("portal.days")}`}
                </p>
                <p className="text-white/40 text-[13px] mt-0.5">
                  {isGrace
                    ? t("portal.renewUnlock")
                    : `${data?.subscription?.plan ?? ""} · ${data?.subscription?.endDate ?? ""}`}
                </p>
              </div>
            </div>
            {(isExpiring || isGrace) && (
              <Link href="/renew" className={cn(
                "text-[12px] font-bold px-3 py-1.5 uppercase tracking-wider",
                isGrace ? "bg-danger/20 text-danger" : "bg-gold/20 text-gold"
              )}>
                {t("common.renew")}
              </Link>
            )}
          </section>
        )}

        {/* ── Daily Workout Card ── */}
        <section className="relative bg-white/[0.04] border border-white/[0.06] overflow-hidden">
          <div className="flex items-center">
            <div className="flex-1 h-[6px] danger-tape" />
          </div>
          <div className="flex justify-center gap-0 -mt-[1px]">
            <ChevronDown className="text-gold/60" />
            <ChevronDown className="text-gold/40" />
            <ChevronDown className="text-gold/60" />
          </div>
          <div className="absolute top-2 -left-2 w-16 h-24 opacity-40 pointer-events-none select-none z-0">
            <Image src="/fig-bicep.png" alt="" fill className="object-contain object-left-top" unoptimized />
          </div>
          <div className="relative p-6 pb-4">
            <p className="text-gold/60 text-[11px] font-bold uppercase tracking-[0.15em]">
              {t("common.today")}
            </p>
            {data?.workout ? (
              <>
                <h2 className="text-white font-display text-[28px] tracking-wider leading-none mt-2">
                  {data.workout.name}
                </h2>
                <p className="text-white/40 text-[15px] mt-2">
                  {data.workout.subtitle} · {data.workout.exerciseCount} {t("portal.exercises")}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-white/60 font-display text-[22px] tracking-wider leading-none mt-2">
                  {t("portal.noPlan")}
                </h2>
                <p className="text-white/30 text-[14px] mt-2">{t("portal.noPlanDesc")}</p>
              </>
            )}
          </div>
          <div className="relative px-6 pb-6">
            <Link href="/portal/workouts"
              className="relative flex items-center justify-center gap-2 w-full bg-gold hover:bg-gold-high active:bg-gold-deep text-void font-bold text-[16px] py-4 transition-all duration-200"
              style={{ minHeight: "56px" }}>
              <OxDumbbell size={20} />
              {t("portal.startWorkout")}
            </Link>
          </div>
          <div className="h-[4px] danger-tape-thin" />
        </section>

        {/* ── Quick Actions ── */}
        <section className="grid grid-cols-2 gap-3">
          <Link href="/portal/order-meal"
            className="group relative bg-emerald-950/40 border border-emerald-500/20 p-5 hover:bg-emerald-900/30 hover:border-emerald-400/30 active:scale-[0.98] transition-all duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] opacity-40" style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0px,#10b981 6px,transparent 6px,transparent 12px)" }} />
            <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center mb-4">
              <OxFork size={22} className="text-emerald-400" />
            </div>
            <p className="text-white text-[16px] font-semibold">{t("portal.orderMeal")}</p>
            <p className="text-emerald-400/60 text-[13px] mt-1">{t("portal.orderMealSub")}</p>
          </Link>

          <Link href="/portal/shop"
            className="group relative bg-blue-950/40 border border-blue-500/20 p-5 hover:bg-blue-900/30 hover:border-blue-400/30 active:scale-[0.98] transition-all duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] opacity-40" style={{ backgroundImage: "repeating-linear-gradient(90deg,#3b82f6 0px,#3b82f6 6px,transparent 6px,transparent 12px)" }} />
            <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center mb-4">
              <OxBag size={22} className="text-blue-400" />
            </div>
            <p className="text-white text-[16px] font-semibold">{t("portal.shop")}</p>
            <p className="text-blue-400/60 text-[13px] mt-1">{t("portal.shopSub")}</p>
          </Link>
        </section>

        {/* ── Smart Suggestions ── */}
        {suggestions.length > 0 && (
          <section>
            {/* Divider */}
            <div className="flex items-center gap-3 py-1 mb-4">
              <div className="flex-1 h-[3px] danger-tape-thin opacity-15" />
              <p className="text-white/20 text-[10px] font-mono uppercase tracking-[0.2em]">مقترح لك</p>
              <div className="flex-1 h-[3px] danger-tape-thin opacity-15" />
            </div>

            <div className="space-y-3">
              {suggestions.map((s) => (
                <Link
                  key={s.id}
                  href={s.href}
                  className={cn(
                    "group relative flex items-center gap-4 p-4 border transition-all duration-200 active:scale-[0.99] overflow-hidden",
                    s.accent
                  )}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] opacity-30" style={{ backgroundImage: s.stripe }} />
                  <div className={cn("w-11 h-11 flex items-center justify-center border flex-shrink-0", s.border, "bg-white/[0.04]")}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[15px] font-semibold leading-snug">{s.label}</p>
                    <p className="text-white/40 text-[12px] mt-0.5 leading-relaxed truncate">{s.sub}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white/20 flex-shrink-0 rotate-180 group-hover:text-white/40 transition-colors">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Decorative divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-[3px] danger-tape-thin opacity-10" />
          <Image src="/ox-o-logo.png" alt="" width={24} height={24} className="w-5 h-5 opacity-10" unoptimized />
          <div className="flex-1 h-[3px] danger-tape-thin opacity-10" />
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg width="28" height="14" viewBox="0 0 28 14" fill="currentColor" className={className}>
      <path d="M0 0L14 10L28 0V4L14 14L0 4V0Z" />
    </svg>
  );
}
