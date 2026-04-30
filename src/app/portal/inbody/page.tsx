"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxPulse, OxFile, OxHeart, OxHelp, OxCheck, OxClock, OxAlert } from "@/components/icons/OxIcons";

const reasons = [
  { id: "progress",  label: "متابعة التقدم",       icon: OxPulse, description: "قياس التغيرات في تكوين الجسم" },
  { id: "program",   label: "برنامج جديد",          icon: OxFile,  description: "بدء برنامج تدريبي جديد" },
  { id: "health",    label: "فحص صحي دوري",        icon: OxHeart, description: "تقييم صحي روتيني" },
  { id: "other",     label: "سبب آخر",             icon: OxHelp,  description: "شيء آخر" },
];

// InBody pre-test conditions, preferences, and contraindications.
// Shown on the request page so the user can read them before booking.
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

const previousRequests = [
  { date: "١٠ مارس ٢٠٢٦",  reason: "متابعة التقدم", status: "مكتمل" },
  { date: "٢٢ يناير ٢٠٢٦", reason: "برنامج جديد",    status: "مكتمل" },
  { date: "٥ ديسمبر ٢٠٢٥", reason: "فحص صحي دوري", status: "قيد الانتظار" },
];

export default function InbodyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => setSubmitted(true);
  const handleReset  = () => { setCurrentStep(1); setSelectedReason(null); setNote(""); setSubmitted(false); };

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-1">طلب InBody</h1>
        <p className="text-white/35 text-[14px] mb-6">اطلب فحص تكوين الجسم</p>

        {/* Pre-test conditions panel */}
        <PreTestConditions />

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-bold transition-all",
                currentStep >= step ? "bg-gold text-void" : "bg-white/[0.06] text-white/20"
              )}>
                {submitted && step === 3 ? <OxCheck size={14} /> : step}
              </div>
              {step < 3 && (
                <div className={cn("w-10 h-[2px] rounded-full transition-colors", currentStep > step ? "bg-gold" : "bg-white/[0.06]")} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Reason */}
        {currentStep === 1 && (
          <div>
            <p className="text-white text-[17px] font-semibold mb-4">لماذا تحتاج إلى الفحص؟</p>
            <div className="space-y-3">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={cn(
                      "w-full border p-4 flex items-center gap-4 text-right rtl:text-right transition-all duration-200",
                      selectedReason === reason.id
                        ? "bg-gold/[0.06] border-gold/20"
                        : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                    )}
                    style={{ minHeight: 64 }}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedReason === reason.id ? "bg-gold/15" : "bg-white/[0.06]")}>
                      <Icon size={18} className={selectedReason === reason.id ? "text-gold" : "text-white/30"} />
                    </div>
                    <div>
                      <p className="text-white text-[15px] font-medium">{reason.label}</p>
                      <p className="text-white/30 text-[13px] mt-0.5">{reason.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              disabled={!selectedReason}
              onClick={() => setCurrentStep(2)}
              className={cn("mt-6 w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 transition-all", !selectedReason && "opacity-30 cursor-not-allowed")}
              style={{ minHeight: 56 }}
            >
              التالي
            </button>
          </div>
        )}

        {/* Step 2 — Note */}
        {currentStep === 2 && (
          <div>
            <p className="text-white text-[17px] font-semibold mb-4">أضف ملاحظة (اختياري)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أي تفاصيل تريد إبلاغ مدربك بها..."
              className="w-full bg-white/[0.04] border border-white/[0.06] p-4 text-[15px] text-white placeholder:text-white/20 resize-none h-32 focus:outline-none focus:border-gold/30 transition"
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCurrentStep(1)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[16px] py-4 transition-colors" style={{ minHeight: 56 }}>رجوع</button>
              <button onClick={() => setCurrentStep(3)} className="flex-1 bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 transition-colors" style={{ minHeight: 56 }}>التالي</button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {currentStep === 3 && !submitted && (
          <div>
            <p className="text-white text-[17px] font-semibold mb-4">تأكيد الطلب</p>
            <div className="bg-white/[0.03] border border-white/[0.06] p-5 space-y-4">
              <div>
                <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">السبب</p>
                <p className="text-white text-[16px] mt-1">{reasons.find((r) => r.id === selectedReason)?.label}</p>
              </div>
              {note && (
                <div>
                  <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">الملاحظة</p>
                  <p className="text-white/60 text-[14px] mt-1">{note}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCurrentStep(2)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[16px] py-4 transition-colors" style={{ minHeight: 56 }}>رجوع</button>
              <button onClick={handleSubmit} className="flex-1 bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 transition-colors" style={{ minHeight: 56 }}>إرسال</button>
            </div>
          </div>
        )}

        {/* Success */}
        {currentStep === 3 && submitted && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
              <OxCheck size={28} className="text-gold" />
            </div>
            <h2 className="text-white font-display text-[28px] tracking-wider">تم إرسال الطلب</h2>
            <p className="text-white/40 text-[15px] mt-2">سيتم إشعارك عند جدولة الفحص.</p>
            <button onClick={handleReset} className="mt-6 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[15px] px-6 py-3.5 transition-colors">طلب جديد</button>
          </div>
        )}

        {/* Previous requests */}
        <div className="mt-12">
          <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em] mb-3 px-1">الطلبات السابقة</p>
          <div className="bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
            {previousRequests.map((req, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <OxClock size={16} className="text-white/25" />
                  </div>
                  <div>
                    <p className="text-white text-[15px] font-medium">{req.reason}</p>
                    <p className="text-white/30 text-[12px] mt-0.5">{req.date}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[11px] font-bold px-3 py-1",
                  req.status === "مكتمل"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-gold/10 text-gold"
                )}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreTestConditions() {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
          <OxAlert size={16} className="text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[15px] font-semibold">شروط فحص جهاز InBody</p>
          <p className="text-white/40 text-[12px] mt-0.5">اقرأ التعليمات قبل تقديم الطلب</p>
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
