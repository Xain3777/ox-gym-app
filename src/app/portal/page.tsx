"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { OxDumbbell, OxFork, OxBag, OxClock, OxAlert } from "@/components/icons/OxIcons";
import { daysUntilExpiry, getDetailedStatus } from "@/lib/subscription";
import type { DetailedSubStatus } from "@/lib/subscription";

interface UserData {
  name: string;
  subscription: {
    plan: string;
    status: DetailedSubStatus;
    daysLeft: number;
    endDate: string;
    rawDays: number;
  } | null;
  workout: {
    name: string;
    subtitle: string;
    exerciseCount: number;
  } | null;
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

        const { data: member } = await supabase
          .from("members")
          .select("full_name, status")
          .eq("auth_id", user.id)
          .single();

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_type, end_date, status")
          .eq("member_id", (await supabase.from("members").select("id").eq("auth_id", user.id).single()).data?.id ?? "")
          .eq("status", "active")
          .order("end_date", { ascending: false })
          .limit(1)
          .single();

        const memberId = (await supabase.from("members").select("id").eq("auth_id", user.id).single()).data?.id;
        let workout = null;
        if (memberId) {
          const { data: planSend } = await supabase
            .from("plan_sends")
            .select("plan_id, plan_type")
            .eq("member_id", memberId)
            .eq("plan_type", "workout")
            .order("sent_at", { ascending: false })
            .limit(1)
            .single();

          if (planSend) {
            const { data: plan } = await supabase
              .from("workout_plans")
              .select("name, category, content")
              .eq("id", planSend.plan_id)
              .single();
            if (plan) {
              const content = plan.content as Array<{ exercises?: unknown[] }>;
              workout = {
                name: content?.[0] ? (plan.name ?? "Workout") : plan.name,
                subtitle: plan.category ?? "",
                exerciseCount: content?.[0]?.exercises ? (content[0].exercises as unknown[]).length : 0,
              };
            }
          }
        }

        const rawDays = sub ? daysUntilExpiry(sub.end_date) : -999;
        const status = sub ? getDetailedStatus(sub.end_date) : "locked";

        // Use the member's actual first name as entered (Arabic or Latin)
        const firstName = member?.full_name?.split(" ")[0] ?? "";

        setData({
          name: firstName,
          subscription: sub ? {
            plan: sub.plan_type,
            status,
            daysLeft: Math.max(0, rawDays),
            rawDays,
            endDate: new Date(sub.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          } : null,
          workout,
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
  const isExpired  = subStatus === "locked" || (!data?.subscription);
  const rawDays    = data?.subscription?.rawDays ?? -999;

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

        {/* ── 5-day expiry notice (dismissible) ── */}
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
            <button
              onClick={() => setNoticeDismissed(true)}
              className="text-white/20 hover:text-white/50 text-[18px] leading-none flex-shrink-0 transition-colors"
              aria-label="إغلاق"
            >
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
              <p className="text-danger text-[14px] font-semibold leading-snug">
                انتهى اشتراكك
              </p>
              <p className="text-white/40 text-[12px] mt-1 leading-relaxed">
                {rawDays === -1
                  ? "لا يزال بإمكانك الوصول لمدة يوم واحد إضافي — نتمنى لك استمرارية."
                  : "لا يزال بإمكانك الوصول لمدة يومين إضافيين — نتمنى لك استمرارية."}
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
              {t("portal.welcome")}{data?.name ? `، ${data.name}` : ""}
            </h1>
            {data?.subscription && !isGrace && !isExpired && (
              <p className="text-white/30 text-[12px] mt-1 font-mono">
                {t("portal.subscriptionActive")} · {data.subscription.plan}
              </p>
            )}
          </div>
          <Image src="/ox-logo.png" alt="OX GYM" width={120} height={120} className="w-14 h-14 object-contain" unoptimized />
        </section>

        {/* ── Plan End Card ── */}
        <section
          className={cn(
            "relative p-5 flex items-center justify-between border overflow-hidden",
            (isGrace || isExpired) ? "bg-danger/[0.08] border-danger/20"
              : isExpiring ? "bg-gold/[0.06] border-gold/20"
              : "bg-white/[0.04] border-white/[0.06]"
          )}
        >
          <div className="absolute top-0 left-0 right-0 h-[6px] overflow-hidden">
            <div className="w-full h-full danger-tape-thin opacity-40" />
          </div>

          <div className="flex items-center gap-3">
            {(isExpiring || isGrace || isExpired) ? (
              <OxAlert size={20} className={(isGrace || isExpired) ? "text-danger" : "text-gold"} />
            ) : (
              <OxClock size={20} className="text-gold" />
            )}
            <div>
              <p className={cn(
                "text-[16px] font-semibold",
                (isGrace || isExpired) ? "text-danger" : isExpiring ? "text-gold" : "text-white"
              )}>
                {isGrace
                  ? "مهلة الوصول نشطة"
                  : isExpired
                  ? t("portal.planExpired")
                  : `${t("portal.endsIn")} ${data?.subscription?.daysLeft ?? 0} ${t("portal.days")}`}
              </p>
              <p className="text-white/40 text-[13px] mt-0.5">
                {isGrace || isExpired
                  ? t("portal.renewUnlock")
                  : `${data?.subscription?.plan ?? ""} · ${data?.subscription?.endDate ?? ""}`}
              </p>
            </div>
          </div>
          {(isExpiring || isGrace || isExpired) && (
            <span className={cn(
              "text-[12px] font-bold px-3 py-1.5 uppercase tracking-wider",
              (isGrace || isExpired) ? "bg-danger/20 text-danger" : "bg-gold/20 text-gold"
            )}>
              {t("common.renew")}
            </span>
          )}
        </section>

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
            <div className="flex items-center justify-between mb-1">
              <p className="text-gold/60 text-[11px] font-bold uppercase tracking-[0.15em]">
                {t("common.today")}
              </p>
            </div>
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
            <Link
              href="/portal/workouts"
              className="relative flex items-center justify-center gap-2 w-full bg-gold hover:bg-gold-high active:bg-gold-deep text-void font-bold text-[16px] py-4 transition-all duration-200 group overflow-visible"
              style={{ minHeight: "56px" }}
            >
              <OxDumbbell size={20} />
              {t("portal.startWorkout")}
            </Link>
          </div>
          <div className="h-[4px] danger-tape-thin" />
        </section>

        {/* ── Quick Actions ── */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/portal/order-meal"
            className="group relative bg-emerald-950/40 border border-emerald-500/20 p-5 hover:bg-emerald-900/30 hover:border-emerald-400/30 active:scale-[0.98] transition-all duration-200 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] opacity-40" style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0px,#10b981 6px,transparent 6px,transparent 12px)" }} />
            <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center mb-4">
              <OxFork size={22} className="text-emerald-400" />
            </div>
            <p className="text-white text-[16px] font-semibold">{t("portal.orderMeal")}</p>
            <p className="text-emerald-400/60 text-[13px] mt-1">{t("portal.orderMealSub")}</p>
          </Link>

          <Link
            href="/portal/shop"
            className="group relative bg-blue-950/40 border border-blue-500/20 p-5 hover:bg-blue-900/30 hover:border-blue-400/30 active:scale-[0.98] transition-all duration-200 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] opacity-40" style={{ backgroundImage: "repeating-linear-gradient(90deg,#3b82f6 0px,#3b82f6 6px,transparent 6px,transparent 12px)" }} />
            <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center mb-4">
              <OxBag size={22} className="text-blue-400" />
            </div>
            <p className="text-white text-[16px] font-semibold">{t("portal.shop")}</p>
            <p className="text-blue-400/60 text-[13px] mt-1">{t("portal.shopSub")}</p>
          </Link>
        </section>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-[3px] danger-tape-thin opacity-15" />
          <Image src="/ox-o-logo.png" alt="" width={24} height={24} className="w-5 h-5 opacity-15" unoptimized />
          <div className="flex-1 h-[3px] danger-tape-thin opacity-15" />
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
