"use client";

import Link from "next/link";

// Subscription information page. Players reach this from "Subscribe Now"
// or "Renew" buttons in the portal. There is no online checkout — the
// page lists every plan + every offer and tells the player to pay at
// reception. Pricing source: edits.txt (final spec).

const PLANS = [
  { id: 1, label_ar: "يوم واحد", duration: "1 day",     price_usd: 5   },
  { id: 2, label_ar: "١٥ يوم",   duration: "15 days",   price_usd: 20  },
  { id: 3, label_ar: "شهر واحد", duration: "30 days",   price_usd: 35  },
  { id: 4, label_ar: "٣ أشهر",  duration: "90 days",   price_usd: 90  },
  { id: 5, label_ar: "٦ أشهر",  duration: "180 days",  price_usd: 170 },
  { id: 6, label_ar: "٩ أشهر",  duration: "270 days",  price_usd: 235 },
  { id: 7, label_ar: "١٢ شهر",  duration: "365 days",  price_usd: 300 },
];

const OFFERS = [
  { id: 1, label_ar: "بدون عرض",       code: "none",      effect_ar: "السعر الكامل",         note_ar: "الخيار الافتراضي" },
  { id: 2, label_ar: "عرض الزوجين",    code: "couple",    effect_ar: "$60 لشخصين",           note_ar: "خطة الشهر فقط" },
  { id: 3, label_ar: "شركات / بنك",   code: "corporate", effect_ar: "خصم ١٥٪",              note_ar: "موظفي الشركات والبنوك" },
  { id: 4, label_ar: "خصم طلاب",       code: "college",   effect_ar: "خصم ٢٠٪",              note_ar: "طلاب الجامعات" },
  { id: 5, label_ar: "جيران البناء",   code: "neighbors", effect_ar: "خصم ٢٠٪",              note_ar: "سكان البناء المجاور" },
  { id: 6, label_ar: "مجموعة ٥",      code: "group_5",   effect_ar: "٥ يدفعون كأنهم ٤",     note_ar: "السعر للفرد = الأساس × ٤/٥ بنفس group_id" },
  { id: 7, label_ar: "مجموعة ٩",      code: "group_9",   effect_ar: "٩ يدفعون كأنهم ٧",     note_ar: "السعر للفرد = الأساس × ٧/٩ بنفس group_id" },
];

const RULES = [
  "يمكن استخدام عرض واحد فقط لكل اشتراك.",
  "لا يجوز الجمع بين عدة عروض على نفس الاشتراك.",
  "أعضاء المجموعة الواحدة يجب أن يشاركوا نفس group_id.",
  "مجموعة ٥: ٥ أعضاء إجمالاً، يُدفع ثمن ٤ اشتراكات فقط.",
  "مجموعة ٩: ٩ أعضاء إجمالاً، يُدفع ثمن ٧ اشتراكات فقط.",
  "خطط اليوم و١٥ يوماً تتبع نفس قواعد العروض ما لم يُحدَّد غير ذلك.",
];

export default function SubscribeInfoPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-7">

        {/* Header */}
        <div className="text-center">
          <div className="text-3xl font-black text-[#F5C100] tracking-[6px]">OX GYM</div>
          <div className="text-[10px] text-[#555] tracking-[3px] uppercase mt-1">
            HARDER · BETTER · FASTER · STRONGER
          </div>
        </div>

        {/* Visit-reception CTA at the top — what the user actually needs to do */}
        <section className="bg-[#F5C100]/[0.06] border border-[#F5C100]/25 p-5">
          <p className="text-[#F5C100] text-[18px] font-bold leading-snug">للاشتراك، يرجى زيارة الاستقبال</p>
          <p className="text-white/55 text-[13px] mt-1.5 leading-relaxed">
            اطّلع على الخطط والعروض في الأسفل، ثم تواصل مع موظف الاستقبال في النادي لإتمام الدفع وتفعيل الاشتراك.
            لا يوجد دفع إلكتروني داخل التطبيق.
          </p>
        </section>

        {/* Plans */}
        <section className="bg-[#111] border border-[#1E1E1E]">
          <div className="px-5 py-4 border-b border-[#1E1E1E]">
            <h2 className="text-white text-[18px] font-bold">خطط الاشتراك</h2>
            <p className="text-white/35 text-[12px] mt-0.5">جميع الأسعار بالدولار الأميركي</p>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {PLANS.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-white text-[15px] font-semibold">{p.label_ar}</p>
                  <p className="text-white/35 text-[12px] mt-0.5">{p.duration}</p>
                </div>
                <p className="text-[#F5C100] text-[20px] font-black">${p.price_usd}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Offers */}
        <section className="bg-[#111] border border-[#1E1E1E]">
          <div className="px-5 py-4 border-b border-[#1E1E1E]">
            <h2 className="text-white text-[18px] font-bold">العروض المتاحة</h2>
            <p className="text-white/35 text-[12px] mt-0.5">يمكن اختيار عرض واحد فقط</p>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {OFFERS.map((o) => (
              <div key={o.id} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-white text-[15px] font-semibold">{o.label_ar}</p>
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-wider">{o.code}</span>
                </div>
                <p className="text-[#F5C100] text-[13px] mt-1">{o.effect_ar}</p>
                <p className="text-white/40 text-[12px] mt-1">{o.note_ar}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rules */}
        <section className="bg-[#111] border border-[#1E1E1E] px-5 py-5">
          <h2 className="text-white text-[16px] font-bold mb-3">القواعد</h2>
          <ul className="space-y-2 text-white/65 text-[13px] leading-relaxed">
            {RULES.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#F5C100] flex-shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="text-center">
          <Link
            href="/portal"
            className="inline-block text-white/45 text-[13px] hover:text-white/70 transition-colors"
          >
            ← العودة للبوابة
          </Link>
        </div>
      </div>
    </div>
  );
}
