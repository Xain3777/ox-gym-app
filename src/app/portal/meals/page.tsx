"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UtensilsCrossed, ChevronLeft, Sparkles, Activity, Heart, TrendingUp, Send, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createBrowserSupabase } from "@/lib/supabase";
import { SubscriptionGate } from "@/components/portal/SubscriptionGate";
import type { MealProgramTemplate } from "@/lib/meal-programs";
import { MEAL_SLOT_LABELS_AR } from "@/lib/meal-programs";

type AssignmentInfo = { id: string; assigned_at: string } | null;

export default function PortalMealsPage() {
  const { success, error: toastError } = useToast();
  const [endDate, setEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<MealProgramTemplate | null>(null);
  const [assignment, setAssignment] = useState<AssignmentInfo>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: member } = await supabase
            .from("members")
            .select("id")
            .eq("auth_id", user.id)
            .single();

          if (member) {
            const { data: sub } = await supabase
              .from("member_subscriptions")
              .select("end_date")
              .eq("member_id", member.id)
              .eq("status", "active")
              .order("end_date", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (sub?.end_date) setEndDate(sub.end_date);
          }
        }

        const res = await fetch("/api/portal/meal-program");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setTemplate(json.data?.template ?? null);
            setAssignment(json.data?.assignment ?? null);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function submitConsultation() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/meal-consultation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("فشل الإرسال", json.error ?? "حاول مرة أخرى.");
        return;
      }
      setSubmitted(true);
      success(
        json.duplicate ? "طلبك السابق قيد المعالجة" : "تم إرسال طلبك",
        "سيتواصل معك الكوتش قريباً.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10 space-y-5">
        <header className="flex items-center justify-between">
          <Link href="/portal" className="text-white/40 hover:text-white text-[12px] font-mono uppercase tracking-wider flex items-center gap-1.5">
            <ChevronLeft size={14} />
            الرئيسية
          </Link>
          <div className="text-right">
            <p className="text-emerald-400 text-[11px] font-mono uppercase tracking-[0.16em]">OX NUTRITION</p>
            <h1 className="text-white font-display text-[26px] tracking-wider leading-tight mt-1">برنامج غذائي</h1>
          </div>
        </header>

        <SubscriptionGate endDate={endDate}>
          {loading ? (
            <div className="text-center text-white/40 text-[14px] py-16">جار التحميل...</div>
          ) : !template ? (
            <NoPlanCard />
          ) : (
            <PlanView template={template} assignment={assignment} />
          )}

          <ConsultationCard
            note={note}
            setNote={setNote}
            onSubmit={submitConsultation}
            submitting={submitting}
            submitted={submitted}
          />
        </SubscriptionGate>
      </div>
    </div>
  );
}

function NoPlanCard() {
  return (
    <section className="relative bg-white/[0.03] border border-white/[0.08] p-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] opacity-30" style={{
        backgroundImage: "repeating-linear-gradient(90deg,#10b981 0px,#10b981 6px,transparent 6px,transparent 12px)",
      }} />
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed size={22} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-white text-[16px] font-semibold">لم يتم تعيين برنامج غذائي بعد</p>
          <p className="text-white/40 text-[13px] mt-1 leading-relaxed">
            تواصل مع الكوتش أو اطلب استشارة من الأسفل لتحصل على خطة غذائية مخصصة لك.
          </p>
        </div>
      </div>
    </section>
  );
}

function PlanView({ template, assignment }: { template: MealProgramTemplate; assignment: AssignmentInfo }) {
  void assignment;
  return (
    <section className="space-y-5">
      <div className="relative bg-emerald-500/[0.06] border border-emerald-500/20 p-5 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] opacity-40" style={{
          backgroundImage: "repeating-linear-gradient(90deg,#10b981 0px,#10b981 6px,transparent 6px,transparent 12px)",
        }} />
        <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-[0.15em]">برنامجك الغذائي</p>
        <h2 className="text-white font-display text-[26px] tracking-wider leading-none mt-2">{template.name}</h2>
        {template.description && (
          <p className="text-white/55 text-[13px] mt-2 leading-relaxed">{template.description}</p>
        )}
        <p className="text-white/40 text-[12px] mt-2 font-mono">{template.category} · {template.days.length} يوم</p>
      </div>

      {template.days.map((day) => (
        <article key={day.id} className="border border-white/[0.06] bg-white/[0.04] overflow-hidden">
          <header className="p-4 border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <UtensilsCrossed size={17} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[16px] font-semibold">
                {day.day_number ? `اليوم ${day.day_number} · ` : ""}{day.name}
              </p>
              <p className="text-white/35 text-[11px] mt-0.5">{day.meals.length} وجبة</p>
            </div>
          </header>

          <div className="p-4 space-y-3">
            {day.meals.map((meal) => (
              <div key={meal.id} className="border border-white/[0.05] bg-iron/60 p-4">
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.14em]">
                  {MEAL_SLOT_LABELS_AR[meal.meal_slot] ?? meal.meal_slot}
                </p>
                <p className="text-white text-[16px] font-semibold mt-1">{meal.name}</p>
                {meal.description && (
                  <p className="text-white/65 text-[13px] mt-2 leading-relaxed">{meal.description}</p>
                )}
                {meal.example && (
                  <div className="mt-3 bg-emerald-500/[0.05] border border-emerald-500/15 p-3">
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.14em] mb-1">مثال</p>
                    <p className="text-white/80 text-[13px]">{meal.example}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function ConsultationCard({
  note, setNote, onSubmit, submitting, submitted,
}: { note: string; setNote: (v: string) => void; onSubmit: () => void; submitting: boolean; submitted: boolean }) {
  const features = [
    { icon: <Sparkles size={14} />,   label: "خطة غذائية مخصصة" },
    { icon: <Activity size={14} />,   label: "تحليل InBody احترافي" },
    { icon: <Heart size={14} />,      label: "متابعة دورية ودعم مستمر" },
    { icon: <TrendingUp size={14} />, label: "نتائج حقيقية وصحية" },
  ];

  return (
    <section className="relative bg-gradient-to-br from-emerald-500/[0.08] to-emerald-900/10 border border-emerald-500/25 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[6px] overflow-hidden">
        <div className="w-full h-full" style={{
          backgroundImage: "repeating-linear-gradient(90deg,#10b981 0px,#10b981 8px,transparent 8px,transparent 16px)",
        }} />
      </div>
      <div className="absolute -top-2 -left-6 w-24 h-24 opacity-40 pointer-events-none select-none">
        <Image src="/fig-charge.png" alt="" fill className="object-contain" unoptimized />
      </div>

      <div className="relative p-6">
        <p className="text-emerald-400 text-[10px] font-mono uppercase tracking-[0.2em] mb-2">
          PROFESSIONAL MEAL PLAN + INBODY TEST
        </p>
        <h3 className="text-white font-display text-[24px] tracking-wider leading-tight">
          احجز استشارتك الخاصة الآن
        </h3>
        <p className="text-white/55 text-[13px] mt-3 leading-relaxed">
          خطة تغذية مخصصة + تحليل InBody دقيق لمتابعة التقدم وتحقيق أفضل النتائج.
        </p>

        <ul className="grid grid-cols-2 gap-2 mt-5">
          {features.map((f) => (
            <li key={f.label} className="flex items-center gap-2 bg-white/[0.03] border border-emerald-500/15 px-3 py-2">
              <span className="text-emerald-400 flex-shrink-0">{f.icon}</span>
              <span className="text-white/80 text-[12px] leading-tight">{f.label}</span>
            </li>
          ))}
        </ul>

        {submitted ? (
          <div className="mt-5 bg-emerald-500/15 border border-emerald-500/30 p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Check size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-emerald-200 text-[14px] font-semibold">تم استلام طلبك</p>
              <p className="text-emerald-200/70 text-[12px] mt-0.5">سيتواصل معك الكوتش قريباً.</p>
            </div>
          </div>
        ) : (
          <>
            <label className="block mt-5">
              <span className="text-white/35 text-[10px] font-bold uppercase tracking-[0.14em]">ملاحظات (اختياري)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="مثال: أهدف لتنشيف 5 كجم قبل الصيف"
                className="mt-1.5 w-full bg-iron border border-emerald-500/20 text-white text-[13px] p-3 placeholder:text-white/25 focus:border-emerald-500/50 focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-void font-bold text-[15px] py-3.5 transition-all"
            >
              <Send size={16} />
              {submitting ? "جار الإرسال..." : "احجز استشارتك الآن"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
