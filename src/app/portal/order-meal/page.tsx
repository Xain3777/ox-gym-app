"use client";

import { useState } from "react";
import Image from "next/image";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxFlame } from "@/components/icons/OxIcons";

// In-app meal ordering is currently disabled — the gym only sells one
// meal and orders are placed at the reception desk in person. The page
// shows the meal info + a button that surfaces a "go to reception" notice
// instead of placing an order via /api/portal/order-meal.

const MEAL = {
  id:   "chicken_rice_salad",
  name: "وجبة الدجاج مع الرز والسلطة",
  cal:  620,
  price_syp: 29_000,
  desc: "صدر دجاج مشوي مع رز بسمتي وسلطة طازجة (خيار، خس، بندورة، زيتون أسود، ذرة، دبس رمان).",
  guarantees: [
    "٢٨٥ غ رز بعد الطبخ",
    "١٥٠ غ دجاج بعد الطبخ",
  ],
  image: "🍗",
};

export default function OrderMealPage() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-[#071a12]" style={{ height: 200 }}>
        <div className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0,#10b981 14px,#071a12 14px,#071a12 28px)", opacity: 0.9 }} />
        <div className="absolute inset-0 flex items-end justify-end rtl:justify-start pr-4 rtl:pl-4 rtl:pr-0 pb-2 z-0 pointer-events-none select-none">
          <div className="relative w-36 h-44 opacity-25">
            <Image src="/fig-charge.png" alt="" fill className="object-contain object-bottom" unoptimized />
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(16,185,129,0.04) 28px,rgba(16,185,129,0.04) 30px)" }} />
        <div className="absolute bottom-8 left-0 right-0 z-10 px-5">
          <BackArrow href="/portal" className="mb-2" />
          <p className="font-display text-[38px] leading-none tracking-wider text-emerald-400">وجبة الجيم</p>
          <p className="text-white/40 text-[13px] mt-1">وجبة طازجة محضّرة في الصالة</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0,#10b981 14px,transparent 14px,transparent 28px)", opacity: 0.4 }} />
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-5 pt-6">
        <div className="bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="aspect-[3/2] bg-white/[0.02] flex items-center justify-center text-[88px]">
            {MEAL.image}
          </div>
          <div className="p-5 space-y-4" dir="rtl">
            <div>
              <p className="text-white text-[20px] font-bold leading-snug">{MEAL.name}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-white/50 text-[13px] flex items-center gap-1">
                  <OxFlame size={12} />{MEAL.cal} سعرة
                </span>
                <span className="text-emerald-400 text-[18px] font-bold">
                  {MEAL.price_syp.toLocaleString("ar-SY")} ل.س
                </span>
              </div>
            </div>
            <p className="text-white/45 text-[14px] leading-relaxed">{MEAL.desc}</p>

            <div className="bg-emerald-950/30 border border-emerald-500/15 p-3">
              <p className="text-emerald-400/70 text-[11px] font-bold uppercase tracking-[0.12em] mb-2">المضمون</p>
              <ul className="text-white/70 text-[13px] leading-relaxed space-y-0.5">
                {MEAL.guarantees.map((g, i) => (
                  <li key={i}>• {g}</li>
                ))}
              </ul>
            </div>

            {showNotice && (
              <div className="bg-gold/[0.06] border border-gold/20 p-4 text-center">
                <p className="text-gold text-[15px] font-semibold">يرجى زيارة الاستقبال</p>
                <p className="text-white/50 text-[13px] mt-1">
                  لتأكيد الطلب وإتمام الدفع، تحدّث مع موظف الاستقبال في النادي.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowNotice(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[15px] py-3.5 transition-colors"
              style={{ minHeight: 52 }}
            >
              اطلب من الاستقبال
            </button>
          </div>
        </div>

        <p className="text-white/30 text-[12px] text-center mt-5 leading-relaxed">
          الطلب يتم عند الاستقبال — لا يوجد طلب مباشر من التطبيق حالياً.
        </p>
      </div>
    </div>
  );
}
