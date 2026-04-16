"use client";

import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import {
  OxDumbbell, OxFork, OxStar, OxCheck, OxClock, OxShield,
} from "@/components/icons/OxIcons";

// ── Subscription plans ──────────────────────────────────────────
const plans = [
  {
    name: "شهري",
    price: 150,
    period: "شهر",
    color: "border-white/20",
    accent: "text-white",
    badge: null,
    features: [
      "دخول كامل للجيم",
      "برنامج تمارين مخصص",
      "متابعة التقدم",
      "دعم على التطبيق",
    ],
  },
  {
    name: "ربع سنوي",
    price: 390,
    period: "٣ أشهر",
    color: "border-gold/40",
    accent: "text-gold",
    badge: "الأكثر شيوعاً",
    features: [
      "كل مزايا الشهري",
      "فحص InBody مجاني",
      "خطة وجبات مخصصة",
      "جلسة مع مدرب شخصي",
    ],
  },
  {
    name: "سنوي",
    price: 1200,
    period: "١٢ شهر",
    color: "border-gold/25",
    accent: "text-gold",
    badge: "الأوفر",
    features: [
      "كل مزايا الربع سنوي",
      "فحوصات InBody شهرية",
      "جلستان مع مدرب شهرياً",
      "خصم ١٠٪ على المتجر",
      "دخول لجميع الفعاليات",
    ],
  },
];

// ── Gym facilities ──────────────────────────────────────────────
const facilities = [
  { icon: OxDumbbell, label: "أجهزة تمرين متطورة", sub: "+٨٠ جهاز من أفضل الماركات" },
  { icon: OxFork,     label: "ركن التغذية",          sub: "وجبات صحية ومكملات مباشرة" },
  { icon: OxStar,     label: "مدربون محترفون",       sub: "فريق معتمد دولياً" },
  { icon: OxShield,   label: "بيئة آمنة ونظيفة",    sub: "تعقيم يومي وأنظمة أمان" },
  { icon: OxClock,    label: "مواعيد مرنة",          sub: "مفتوح ٦ص – ١٢م يومياً" },
];

export default function GymInfoPage() {
  return (
    <div className="min-h-full pb-28 lg:pb-10">

      {/* ── Hero ────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-[#0a0a0a]" style={{ height: 200 }}>
        <div className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#F5C100 0,#F5C100 14px,#0a0a0a 14px,#0a0a0a 28px)", opacity: 0.9 }} />

        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(245,193,0,0.03) 28px,rgba(245,193,0,0.03) 30px)" }} />

        <div className="absolute bottom-8 left-0 right-0 z-10 px-5">
          <BackArrow href="/portal/more" className="mb-2" />
          <p className="font-display text-[38px] leading-none tracking-wider text-gold">OX GYM</p>
          <p className="text-white/40 text-[13px] mt-1">معلومات الاشتراكات والخدمات</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#F5C100 0,#F5C100 14px,transparent 14px,transparent 28px)", opacity: 0.4 }} />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-8 space-y-10">

        {/* ── Subscription plans ──────────────────────── */}
        <section>
          <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">الاشتراكات</p>
          <p className="text-white font-display text-[22px] tracking-wider leading-none mb-5">خطط العضوية</p>

          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative border p-5 transition-all duration-200 bg-white/[0.02]",
                  plan.color
                )}
              >
                {plan.badge && (
                  <span className="absolute top-4 left-4 rtl:left-auto rtl:right-4 text-[10px] font-bold px-2.5 py-1 bg-gold/20 text-gold border border-gold/20">
                    {plan.badge}
                  </span>
                )}

                <div className="flex items-end justify-between mb-4 mt-1">
                  <div>
                    <p className={cn("font-display text-[26px] tracking-wider leading-none", plan.accent)}>
                      {plan.name}
                    </p>
                    <p className="text-white/30 text-[13px] mt-1">{plan.period}</p>
                  </div>
                  <div className="text-right rtl:text-left">
                    <p className={cn("text-[28px] font-bold leading-none", plan.accent)}>{plan.price} <span className="text-[14px] font-normal text-white/40">ر.س</span></p>
                  </div>
                </div>

                <div className="space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <OxCheck size={14} className="text-gold shrink-0" />
                      <span className="text-white/60 text-[14px]">{f}</span>
                    </div>
                  ))}
                </div>

                <button className="mt-5 w-full bg-gold/[0.08] border border-gold/20 text-gold font-semibold text-[14px] py-3 hover:bg-gold/15 transition-colors">
                  استفسر عن هذه الخطة
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Facilities ──────────────────────────────── */}
        <section>
          <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">المرافق</p>
          <p className="text-white font-display text-[22px] tracking-wider leading-none mb-5">ما يميّزنا</p>

          <div className="bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
            {facilities.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-gold/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-gold" />
                </div>
                <div>
                  <p className="text-white text-[15px] font-medium">{label}</p>
                  <p className="text-white/35 text-[13px] mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact ─────────────────────────────────── */}
        <section>
          <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">التواصل</p>
          <p className="text-white font-display text-[22px] tracking-wider leading-none mb-5">تواصل معنا</p>

          <div className="bg-white/[0.03] border border-white/[0.06] p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-white/40 text-[14px]">الهاتف</span>
              <span className="text-white text-[14px] font-medium" dir="ltr">+966 XX XXX XXXX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-[14px]">واتساب</span>
              <span className="text-white text-[14px] font-medium" dir="ltr">+966 XX XXX XXXX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-[14px]">العنوان</span>
              <span className="text-white text-[14px] font-medium">الرياض، المملكة العربية السعودية</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-[14px]">مواعيد العمل</span>
              <span className="text-white text-[14px] font-medium">٦ ص – ١٢ م يومياً</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
