"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxCheck, OxRefresh } from "@/components/icons/OxIcons";

const mockMealPlan = [
  { name: "Breakfast", time: "7:00 AM", items: [{ name: "Oats", quantity: "80g" }, { name: "Whole Eggs", quantity: "3 eggs" }, { name: "Banana", quantity: "1 medium" }, { name: "Honey", quantity: "1 tbsp" }], done: false },
  { name: "Snack", time: "10:00 AM", items: [{ name: "Greek Yogurt", quantity: "200g" }, { name: "Mixed Nuts", quantity: "30g" }, { name: "Blueberries", quantity: "50g" }], done: false },
  { name: "Lunch", time: "1:00 PM", items: [{ name: "Grilled Chicken Breast", quantity: "200g" }, { name: "Basmati Rice", quantity: "200g" }, { name: "Mixed Salad", quantity: "1 bowl" }, { name: "Olive Oil", quantity: "1 tbsp" }], done: false },
  { name: "Pre-Workout", time: "4:00 PM", items: [{ name: "Whole Wheat Bread", quantity: "2 slices" }, { name: "Peanut Butter", quantity: "2 tbsp" }, { name: "Coffee", quantity: "1 cup" }], done: false },
  { name: "Dinner", time: "7:30 PM", items: [{ name: "Salmon Fillet", quantity: "180g" }, { name: "Sweet Potato", quantity: "200g" }, { name: "Steamed Broccoli", quantity: "150g" }], done: false },
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
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/shop" label="Shop" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-1">MY MEALS</h1>
        <p className="text-white/35 text-[14px] mb-6">Your daily nutrition plan</p>

        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-[13px]">Today&apos;s Progress</p>
            <p className="text-white text-[15px] font-semibold">{completedCount}/{meals.length}</p>
          </div>
          <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          {meals.map((meal, idx) => (
            <div key={idx} className={cn("rounded-lg border p-4 transition-all duration-200", meal.done ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06]")}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cn("text-[17px] font-semibold", meal.done ? "text-white/40" : "text-white")}>{meal.name}</p>
                  <p className="text-white/25 text-[13px] mt-0.5">{meal.time}</p>
                </div>
                <button onClick={() => toggleMeal(idx)} className={cn("w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200", meal.done ? "bg-gold text-void" : "bg-white/[0.06] border border-white/[0.08] text-white/20 hover:border-gold/40")}>
                  <OxCheck size={18} />
                </button>
              </div>
              <div className="space-y-1.5">
                {meal.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center justify-between">
                    <span className={cn("text-[14px]", meal.done ? "text-white/25 line-through" : "text-white/60")}>{item.name}</span>
                    <span className="text-gold/60 text-[13px] font-medium">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!changeRequested ? (
          <button onClick={() => setChangeRequested(true)} className="mt-6 w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white font-medium text-[15px] py-4 rounded-lg transition-all" style={{ minHeight: "56px" }}>
            <OxRefresh size={16} />Request Meal Plan Change
          </button>
        ) : (
          <div className="mt-6 rounded-lg bg-gold/[0.06] border border-gold/20 p-6 text-center">
            <OxCheck size={28} className="text-gold mx-auto mb-3" />
            <p className="text-white text-[17px] font-semibold">Request Sent</p>
            <p className="text-white/35 text-[14px] mt-1">Your trainer will review and update your meal plan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
