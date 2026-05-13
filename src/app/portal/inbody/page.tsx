"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxAlert, OxCalendar } from "@/components/icons/OxIcons";
import { GYM_RECEPTION_PHONE, GYM_RECEPTION_PHONE_TEL } from "@/lib/gym-contact";

// InBody pre-test conditions, preferences, and contraindications.
// Shown so the user can read them before booking the session at reception.
const PRE_TEST_RULES = [
  "عدم ممارسة الرياضة أو التمرين.",
  "عدم شرب الماء أو أي مشروبات (بما فيها مشروبات الطاقة).",
  "عدم تناول الطعام.",
  "دخول الحمام وإفراغ المثانة.",
  "إزالة الأحذية والجوارب.",
  "إزالة الساعة والإكسسوارات والمعادن.",
  "الوقوف بهدوء عدة دقائق قبل القياس.",
];

const PREFERENCES = [
  "الصيام لمدة ٣–٤ ساعات قبل الفحص.",
  "إجراء الفحص صباحاً.",
  "عمل الفحص في نفس الوقت كل مرة للمقارنة.",
  "للسيدات: عدم إجراء الفحص أثناء الدورة الشهرية لضمان دقّة المتابعة.",
];

const CONTRAINDICATIONS = [
  "يُمنع إجراء الفحص لمن لديهم منظّم ضربات القلب أو أجهزة إلكترونية مزروعة إلا بعد استشارة طبية.",
  "يُفضَّل عدم إجراء الفحص إلا بعد استشارة الطبيب في الحالات الخاصة.",
];

export default function InbodyPage() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10" dir="rtl">
        <BackArrow href="/portal/more" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-1">طلب InBody</h1>
        <p className="text-white/35 text-[14px] mb-6">احجز جلسة فحص تكوين الجسم في الجيم</p>

        {/* What is InBody — short intro */}
        <div className="bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
          <p className="text-white text-[15px] leading-relaxed">
            جهاز <span className="text-gold font-semibold">InBody</span> يقيس تكوين الجسم بدقّة:
            الكتلة العضلية، نسبة الدهون، توزّع السوائل، ومؤشر كتلة الجسم — لمتابعة التقدّم بشكل علمي.
          </p>
        </div>

        {/* Pre-test conditions panel */}
        <PreTestConditions />

        {/* Reception-call notice — appears after pressing "Book a Session" */}
        {showNotice && (
          <div className="bg-gold/[0.06] border border-gold/20 p-4 text-center space-y-3 mb-5">
            <div>
              <p className="text-gold text-[15px] font-semibold">يرجى زيارة الاستقبال أو الاتصال بنا</p>
              <p className="text-white/50 text-[13px] mt-1">
                لتحديد موعد الفحص، تحدث مع موظف الاستقبال في النادي أو اتصل على الرقم التالي.
              </p>
            </div>
            <a
              href={GYM_RECEPTION_PHONE_TEL}
              className="block w-full bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold font-bold text-[15px] py-3 transition-colors"
              dir="ltr"
            >
              {GYM_RECEPTION_PHONE}
            </a>
          </div>
        )}

        {/* Book a session — primary CTA */}
        <button
          onClick={() => setShowNotice(true)}
          className="w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 flex items-center justify-center gap-2 transition-colors"
          style={{ minHeight: 56 }}
        >
          <OxCalendar size={18} />
          احجز جلسة
        </button>

        <p className="text-white/30 text-[12px] text-center mt-3 leading-relaxed">
          الحجز يتم عبر الاستقبال — وقت الفحص يُحدَّد حسب توفّر الجهاز والمشرف.
        </p>
      </div>
    </div>
  );
}

function PreTestConditions() {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] mb-5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
          <OxAlert size={16} className="text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[15px] font-semibold">شروط فحص جهاز InBody</p>
          <p className="text-white/40 text-[12px] mt-0.5">اقرأ التعليمات قبل الحجز</p>
        </div>
        <span className={cn("text-white/40 text-[14px] transition-transform", open && "rotate-180")}>▾</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 text-right">
          <RuleSection title="قبل الفحص مباشرة" items={PRE_TEST_RULES} accent="gold" />
          <RuleSection title="يُفضَّل التالي"     items={PREFERENCES}     accent="emerald" />
          <RuleSection title="موانع الفحص"      items={CONTRAINDICATIONS} accent="danger" />
        </div>
      )}
    </div>
  );
}

function RuleSection({
  title,
  items,
  accent,
}: {
  title: string;
  items: readonly string[];
  accent: "gold" | "emerald" | "danger";
}) {
  const accentClass = {
    gold:    "text-gold",
    emerald: "text-emerald-400",
    danger:  "text-danger",
  }[accent];

  return (
    <div>
      <p className={cn("text-[11px] font-bold uppercase tracking-[0.14em] mb-2", accentClass)}>{title}</p>
      <ul className="text-white/70 text-[13px] leading-relaxed space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className={cn("flex-shrink-0", accentClass)}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
