"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxCheck, OxRefresh } from "@/components/icons/OxIcons";

const mockMealPlan = [
  {
    name: "وجبة ١ — الفطور",
    time: "7:00 ص",
    items: [
      { name: "شوفان", quantity: "٨٠ غ" },
      { name: "بيض كامل", quantity: "٣ بيضات" },
      { name: "موزة", quantity: "١ متوسطة" },
      { name: "عسل", quantity: "١ ملعقة" },
    ],
    done: false,
  },
  {
    name: "وجبة ٢ — الغداء",
    time: "1:00 م",
    items: [
      { name: "صدر دجاج مشوي", quantity: "٢٠٠ غ" },
      { name: "أرز بسمتي", quantity: "٢٠٠ غ" },
      { name: "سلطة مشكلة", quantity: "وعاء" },
      { name: "زيت زيتون", quantity: "١ ملعقة" },
    ],
    done: false,
  },
  {
    name: "وجبة ٣ — العشاء",
    time: "7:30 م",
    items: [
      { name: "سلمون", quantity: "١٨٠ غ" },
      { name: "بطاطا حلوة", quantity: "٢٠٠ غ" },
      { name: "بروكلي مطهو على البخار", quantity: "١٥٠ غ" },
    ],
    done: false,
  },
  {
    name: "سناك",
    time: "3:00 م",
    items: [
      { name: "زبادي يوناني", quantity: "٢٠٠ غ" },
      { name: "مكسرات مشكلة", quantity: "٣٠ غ" },
    ],
    done: false,
  },
  {
    name: "قبل التمرين",
    time: "5:00 م",
    items: [
      { name: "خبز قمح كامل", quantity: "شريحتان" },
      { name: "زبدة فول سوداني", quantity: "٢ ملعقة" },
      { name: "قهوة", quantity: "كوب" },
    ],
    done: false,
  },
];

export default function MealsPage() {
  const [meals, setMeals] = useState(mockMealPlan);
  const [changeRequested, setChangeRequested] = useState(false);

  function toggleMeal(idx: number) {
    setMeals((prev) => prev.map((m, i) => (i === idx ? { ...m, done: !m.done } : m)));
  }

  const completedCount = meals.filter((m) => m.done).length;
  const progress = Math.round((completedCount / meals.length) * 100);

  return (
    <div className="min-h-full pb-28 lg:pb-10">

      {/* ── Hero ──────────────────────────────────────────── */}
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
          <BackArrow href="/portal/workouts" className="mb-2" />
          <p className="font-display text-[38px] leading-none tracking-wider text-emerald-400">وجباتي</p>
          <p className="text-white/40 text-[13px] mt-1">خطة التغذية اليومية</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0,#10b981 14px,transparent 14px,transparent 28px)", opacity: 0.4 }} />
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-5 pt-6">

        {/* Progress bar */}
        <div className="bg-white/[0.04] border border-white/[0.06] p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-[13px]">تقدم اليوم</p>
            <p className="text-white text-[15px] font-semibold">{completedCount}/{meals.length}</p>
          </div>
          <div className="w-full h-2 bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Meal cards */}
        <div className="space-y-3">
          {meals.map((meal, idx) => (
            <div
              key={idx}
              className={cn(
                "border p-4 transition-all duration-200",
                meal.done
                  ? "bg-emerald-950/30 border-emerald-500/20"
                  : "bg-white/[0.03] border-white/[0.06]"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cn("text-[17px] font-semibold", meal.done ? "text-white/40" : "text-white")}>
                    {meal.name}
                  </p>
                  <p className="text-white/25 text-[13px] mt-0.5">{meal.time}</p>
                </div>
                <button
                  onClick={() => toggleMeal(idx)}
                  className={cn(
                    "w-11 h-11 flex items-center justify-center transition-all duration-200",
                    meal.done
                      ? "bg-emerald-500 text-white"
                      : "bg-white/[0.06] border border-white/[0.08] text-white/20 hover:border-emerald-500/40"
                  )}
                >
                  <OxCheck size={18} />
                </button>
              </div>
              <div className="space-y-1.5">
                {meal.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center justify-between">
                    <span className={cn("text-[14px]", meal.done ? "text-white/25 line-through" : "text-white/60")}>
                      {item.name}
                    </span>
                    <span className="text-emerald-400/60 text-[13px] font-medium">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Request change */}
        {!changeRequested ? (
          <button
            onClick={() => setChangeRequested(true)}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white hover:border-emerald-500/20 font-medium text-[15px] py-4 transition-all"
            style={{ minHeight: 56 }}
          >
            <OxRefresh size={16} />
            طلب تغيير خطة الوجبات
          </button>
        ) : (
          <div className="mt-6 bg-emerald-950/30 border border-emerald-500/20 p-6 text-center">
            <OxCheck size={28} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-white text-[17px] font-semibold">تم إرسال الطلب</p>
            <p className="text-white/35 text-[14px] mt-1">سيقوم مدربك بمراجعة وتحديث خطة وجباتك.</p>
          </div>
        )}
      </div>
    </div>
  );
}
