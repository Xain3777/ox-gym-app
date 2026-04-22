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
    price: 35,
    period: "شهر",
    discount: null,
    color: "border-white/20",
    accent: "text-white",
    badge: null,
  },
  {
    name: "٣ أشهر",
    price: 90,
    period: "٣ أشهر",
    discount: "خصم ١٥٪",
    color: "border-white/20",
    accent: "text-white",
    badge: null,
  },
  {
    name: "٦ أشهر",
    price: 170,
    period: "٦ أشهر",
    discount: "خصم ٢٠٪",
    color: "border-gold/40",
    accent: "text-gold",
    badge: "الأكثر شيوعاً",
  },
  {
    name: "٩ أشهر",
    price: 235,
    period: "٩ أشهر",
    discount: "خصم ٢٥٪",
    color: "border-white/20",
    accent: "text-white",
    badge: null,
  },
  {
    name: "١٢ شهر",
    price: 300,
    period: "١٢ شهر",
    discount: "خصم ٣٠٪",
    color: "border-gold/25",
    accent: "text-gold",
    badge: "الأوفر",
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
    <div className="min-h-full pb-28 lg:pb-10" dir="rtl">

      {/* ── Hero ────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-[#0a0a0a]" style={{ height: 200 }}>
        <div className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#F5C100 0,#F5C100 14px,#0a0a0a 14px,#0a0a0a 28px)", opacity: 0.9 }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(245,193,0,0.03) 28px,rgba(245,193,0,0.03) 30px)" }} />
        <div className="absolute bottom-8 left-0 right-0 z-10 px-5" dir="rtl">
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
                  <div className="mb-3">
                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 bg-gold/20 text-gold border border-gold/20">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="flex items-end justify-between">
                  <div>
                    <p className={cn("font-display text-[24px] tracking-wider leading-none", plan.accent)}>
                      {plan.name}
                    </p>
                    <p className="text-white/30 text-[13px] mt-1">{plan.period}</p>
                  </div>
                  <div className="text-left" dir="ltr">
                    <p className={cn("text-[28px] font-bold leading-none", plan.accent)}>
                      ${plan.price}
                    </p>
                    {plan.discount && (
                      <p className="text-[12px] text-green-400 font-semibold mt-0.5 text-right">{plan.discount}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Special Offers ───────────────────────────── */}
        <section>
          <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">عروض خاصة</p>
          <p className="text-white font-display text-[22px] tracking-wider leading-none mb-5">عروض مميزة</p>

          <div className="space-y-3">
            {/* Group offers */}
            <div className="border border-white/10 bg-white/[0.02] p-4">
              <p className="text-gold text-[13px] font-bold mb-2">عروض المجموعات</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <OxCheck size={14} className="text-gold shrink-0 mt-0.5" />
                  <p className="text-white/70 text-[14px]">
                    أنت + <span className="text-white font-semibold">٥ أصدقاء</span> يسجلون ← <span className="text-gold font-bold">شهر مجاناً</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <OxCheck size={14} className="text-gold shrink-0 mt-0.5" />
                  <p className="text-white/70 text-[14px]">
                    أنت + <span className="text-white font-semibold">٩ أصدقاء</span> يسجلون ← <span className="text-gold font-bold">شهرين مجاناً</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Couples offer */}
            <div className="border border-white/10 bg-white/[0.02] p-4">
              <p className="text-gold text-[13px] font-bold mb-2">عرض الزوجين</p>
              <div className="flex items-start gap-3">
                <OxCheck size={14} className="text-gold shrink-0 mt-0.5" />
                <p className="text-white/70 text-[14px]">
                  أنت والزوجة <span className="text-white font-semibold">٦٠$</span>{" "}
                  <span className="line-through text-white/30">٧٠$</span>
                </p>
              </div>
            </div>

            {/* Company / Bank discounts */}
            <div className="border border-white/10 bg-white/[0.02] p-4">
              <p className="text-gold text-[13px] font-bold mb-2">عروض الشركات والبنوك</p>
              <div className="flex items-start gap-3">
                <OxCheck size={14} className="text-gold shrink-0 mt-0.5" />
                <p className="text-white/70 text-[14px]">
                  خصم <span className="text-gold font-bold">١٥٪</span> على الاشتراك الشهري لموظفي الشركات والبنوك
                </p>
              </div>
            </div>

            {/* Daily */}
            <div className="border border-white/10 bg-white/[0.02] p-4">
              <p className="text-gold text-[13px] font-bold mb-2">الاشتراك اليومي</p>
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-[14px]">دخول ليوم واحد</p>
                <p className="text-white font-bold text-[20px]" dir="ltr">$5</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── We Swim ──────────────────────────────────── */}
        <section>
          <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">مدرسة السباحة</p>
          <p className="text-white font-display text-[22px] tracking-wider leading-none mb-5">WE SWIM</p>

          <div className="border border-blue-500/30 bg-blue-500/[0.04] p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-blue-400 text-[18px]">🌊</span>
              </div>
              <div>
                <p className="text-white font-display text-[18px] tracking-wider">WE SWIM</p>
                <p className="text-blue-400/70 text-[12px]">مدرسة السباحة — بإدارة كوتش أدهم زيدان</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                "تدريس السباحة لجميع الأعمار",
                "تدريب احترافي ومتقدم",
                "علاج الإصابات داخل الماء (Hydrotherapy)",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <OxCheck size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-white/60 text-[14px]">{item}</span>
                </div>
              ))}
            </div>

            <a
              href="https://www.instagram.com/weswim"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center border border-blue-500/30 text-blue-400 text-[13px] font-semibold py-3 hover:bg-blue-500/10 transition-colors mt-2"
            >
              زيارة صفحة WE SWIM
            </a>
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

        {/* ── Team ─────────────────────────────────────── */}
        <section>
          <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">الفريق</p>
          <p className="text-white font-display text-[22px] tracking-wider leading-none mb-5">عن الجيم</p>

          <div className="space-y-3">
            {/* Owner */}
            <div className="border border-gold/20 bg-gold/[0.03] p-5">
              <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.12em] mb-2">المالك والمدير</p>
              <p className="text-white text-[18px] font-bold">كوتش أدهم زيدان</p>
              <p className="text-white/40 text-[13px] mt-1">مالك OX GYM و WE SWIM — مدرب متخصص في التدريب الرياضي وإعادة التأهيل</p>
            </div>

            {/* Designer */}
            <div className="border border-white/10 bg-white/[0.02] p-5">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.12em] mb-2">التصميم والهندسة المعمارية</p>
              <p className="text-white text-[18px] font-bold">جولي لؤي صقور</p>
              <p className="text-white/40 text-[13px] mt-1">المهندسة المعمارية المصممة للجيم</p>
            </div>
          </div>
        </section>

        {/* ── Contact ─────────────────────────────────── */}
        <section>
          <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">التواصل</p>
          <p className="text-white font-display text-[22px] tracking-wider leading-none mb-5">تواصل معنا</p>

          <div className="bg-white/[0.03] border border-white/[0.06] p-5 space-y-3">
            {[
              { label: "الهاتف",        value: "+966 XX XXX XXXX", ltr: true },
              { label: "واتساب",        value: "+966 XX XXX XXXX", ltr: true },
              { label: "العنوان",       value: "الرياض، المملكة العربية السعودية" },
              { label: "مواعيد العمل", value: "٦ ص – ١٢ م يومياً" },
            ].map(({ label, value, ltr }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <span className="text-white/40 text-[14px] shrink-0">{label}</span>
                <span className="text-white text-[14px] font-medium text-left" dir={ltr ? "ltr" : "rtl"}>{value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
