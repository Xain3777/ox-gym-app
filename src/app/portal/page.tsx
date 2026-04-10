"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { OxDumbbell, OxFork, OxBag, OxClock, OxAlert } from "@/components/icons/OxIcons";
import { daysUntilExpiry, getSubscriptionStatus } from "@/lib/subscription";

interface UserData {
  name: string;
  subscription: {
    plan: string;
    status: "active" | "expiring" | "expired";
    daysLeft: number;
    endDate: string;
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

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get member profile
        const { data: member } = await supabase
          .from("members")
          .select("full_name, status")
          .eq("auth_id", user.id)
          .single();

        // Get active subscription
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_type, end_date, status")
          .eq("member_id", (await supabase.from("members").select("id").eq("auth_id", user.id).single()).data?.id ?? "")
          .eq("status", "active")
          .order("end_date", { ascending: false })
          .limit(1)
          .single();

        // Get latest assigned workout
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

        const daysLeft = sub ? daysUntilExpiry(sub.end_date) : 0;
        const subStatus = sub ? getSubscriptionStatus(sub.end_date) : "expired";

        setData({
          name: member?.full_name?.split(" ")[0] ?? "Player",
          subscription: sub ? {
            plan: sub.plan_type,
            status: subStatus as "active" | "expiring" | "expired",
            daysLeft: Math.max(0, daysLeft),
            endDate: new Date(sub.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          } : null,
          workout,
        });
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isExpiring = data?.subscription?.status === "expiring";
  const isExpired = data?.subscription?.status === "expired" || !data?.subscription;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/40 text-[14px]">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full pb-28 lg:pb-10">
      <div className="absolute top-6 left-2 rtl:left-auto rtl:right-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-right z-0">
        <Image src="/fig-charge.png" alt="" fill className="object-contain object-left-top" unoptimized />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10 space-y-6">

        {/* Greeting */}
        <section className="relative flex items-center justify-between">
          <div>
            <p className="text-white/40 text-[13px] font-medium uppercase tracking-wider">
              {t("portal.welcome")}
            </p>
            <h1 className="text-gold font-display text-[36px] tracking-wider leading-none mt-1">
              {t("portal.hey")}, {(data?.name ?? "").toUpperCase()}
            </h1>
          </div>
          <Image src="/ox-logo.png" alt="OX GYM" width={120} height={120} className="w-14 h-14 object-contain" unoptimized />
        </section>

        {/* Plan End Card */}
        <section
          className={cn(
            "relative p-5 flex items-center justify-between border overflow-hidden",
            isExpired ? "bg-danger/[0.08] border-danger/20"
              : isExpiring ? "bg-gold/[0.06] border-gold/20"
              : "bg-white/[0.04] border-white/[0.06]"
          )}
        >
          <div className="absolute top-0 left-0 right-0 h-[6px] overflow-hidden">
            <div className="w-full h-full danger-tape-thin opacity-40" />
          </div>

          <div className="flex items-center gap-3">
            {(isExpiring || isExpired) ? (
              <OxAlert size={20} className={isExpired ? "text-danger" : "text-gold"} />
            ) : (
              <OxClock size={20} className="text-gold" />
            )}
            <div>
              <p className={cn(
                "text-[16px] font-semibold",
                isExpired ? "text-danger" : isExpiring ? "text-gold" : "text-white"
              )}>
                {isExpired
                  ? t("portal.planExpired")
                  : `${t("portal.endsIn")} ${data?.subscription?.daysLeft ?? 0} ${t("portal.days")}`}
              </p>
              <p className="text-white/40 text-[13px] mt-0.5">
                {isExpired
                  ? t("portal.renewUnlock")
                  : `${data?.subscription?.plan ?? ""} · ${data?.subscription?.endDate ?? ""}`}
              </p>
            </div>
          </div>
          {(isExpiring || isExpired) && (
            <span className={cn(
              "text-[12px] font-bold px-3 py-1.5 uppercase tracking-wider",
              isExpired ? "bg-danger/20 text-danger" : "bg-gold/20 text-gold"
            )}>
              {t("common.renew")}
            </span>
          )}
        </section>

        {/* Daily Workout Card */}
        <section className="relative bg-white/[0.04] border border-white/[0.06] overflow-hidden">
          <div className="flex items-center">
            <div className="flex-1 h-[6px] danger-tape" />
          </div>
          <div className="flex justify-center gap-0 -mt-[1px]">
            <ChevronDown className="text-gold/60" />
            <ChevronDown className="text-gold/40" />
            <ChevronDown className="text-gold/60" />
          </div>

          <div className="absolute top-2 left-3 rtl:left-auto rtl:right-3 w-20 h-28 opacity-70 pointer-events-none select-none">
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
                  {data.workout.name.toUpperCase()}
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
              <svg className="absolute -top-5 -left-2 w-8 h-8 text-gold group-hover:text-gold-high transition-colors drop-shadow-lg" viewBox="0 0 32 32" fill="currentColor">
                <path d="M4 1C4 1 1 6 2 12C3 17 6 21 10 24C13 26 17 28 17 28L14 20C12 16 11 12 12 8C12.5 5 14 3 14 3L4 1Z" />
              </svg>
              <svg className="absolute -top-5 -right-2 w-8 h-8 text-gold group-hover:text-gold-high transition-colors drop-shadow-lg" viewBox="0 0 32 32" fill="currentColor">
                <path d="M28 1C28 1 31 6 30 12C29 17 26 21 22 24C19 26 15 28 15 28L18 20C20 16 21 12 20 8C19.5 5 18 3 18 3L28 1Z" />
              </svg>
              <OxDumbbell size={20} />
              {t("portal.startWorkout")}
            </Link>
          </div>
          <div className="h-[4px] danger-tape-thin" />
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/portal/shop"
            className="group relative bg-white/[0.04] border border-white/[0.06] p-5 hover:bg-gold/[0.04] hover:border-gold/20 active:scale-[0.98] transition-all duration-200 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-30" />
            <div className="w-12 h-12 bg-gold/10 flex items-center justify-center mb-4">
              <OxFork size={22} className="text-gold" />
            </div>
            <p className="text-white text-[16px] font-semibold">{t("portal.orderMeal")}</p>
            <p className="text-white/35 text-[13px] mt-1">{t("portal.orderMealSub")}</p>
          </Link>

          <Link
            href="/portal/shop?tab=store"
            className="group relative bg-white/[0.04] border border-white/[0.06] p-5 hover:bg-gold/[0.04] hover:border-gold/20 active:scale-[0.98] transition-all duration-200 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-30" />
            <div className="w-12 h-12 bg-danger/[0.08] flex items-center justify-center mb-4">
              <OxBag size={22} className="text-danger" />
            </div>
            <p className="text-white text-[16px] font-semibold">{t("portal.shop")}</p>
            <p className="text-white/35 text-[13px] mt-1">{t("portal.shopSub")}</p>
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
