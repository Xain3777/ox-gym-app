"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  UtensilsCrossed, Coffee, Sun, Moon, Cookie,
  Apple, Beef, Wheat, Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Ingredient {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  vitamins: string;
  minerals: string;
}

interface MealSlot {
  label: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: Ingredient[];
}

interface MealPlanFormState {
  name: string;
  goal: string;
  calories_daily: number;
  created_by: string;
  meals: MealSlot[];
  notes: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MEAL_ICONS: Record<string, React.ElementType> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const GOAL_OPTIONS = ["Weight Loss", "Muscle Gain", "Maintenance", "Clean Bulk", "Lean Bulk"];

const emptyIngredient = (): Ingredient => ({
  name: "", portion: "", calories: 0, protein: 0, carbs: 0, fats: 0, vitamins: "", minerals: "",
});

const defaultMeals = (): MealSlot[] => [
  { label: "Meal 1 — Breakfast", type: "breakfast", ingredients: [emptyIngredient()] },
  { label: "Meal 2 — Lunch",    type: "lunch",     ingredients: [emptyIngredient()] },
  { label: "Meal 3 — Dinner",   type: "dinner",    ingredients: [emptyIngredient()] },
  { label: "Snack",             type: "snack",     ingredients: [emptyIngredient()] },
];

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const inputClass = "w-full bg-charcoal border border-steel text-offwhite text-[13px] px-3 h-[40px] outline-none focus:border-gold transition-colors placeholder:text-slate";
const labelClass = "font-mono text-[10px] tracking-[0.12em] uppercase text-muted mb-1.5 block";
const numberInputClass = "w-full bg-charcoal border border-steel text-offwhite text-[13px] px-2 h-[36px] outline-none focus:border-gold transition-colors text-center";

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CreateMealPlanForm() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [form, setForm] = useState<MealPlanFormState>({
    name: "",
    goal: "",
    calories_daily: 2000,
    created_by: "",
    meals: defaultMeals(),
    notes: "",
  });

  const [expandedMeal, setExpandedMeal] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // ── Helpers ──────────────────────────────────────────────

  function setField<K extends keyof MealPlanFormState>(key: K, value: MealPlanFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateIngredient(mealIdx: number, ingIdx: number, field: keyof Ingredient, value: string | number) {
    setForm((prev) => {
      const meals = [...prev.meals];
      const ingredients = [...meals[mealIdx].ingredients];
      ingredients[ingIdx] = { ...ingredients[ingIdx], [field]: value };
      meals[mealIdx] = { ...meals[mealIdx], ingredients };
      return { ...prev, meals };
    });
  }

  function addIngredient(mealIdx: number) {
    setForm((prev) => {
      const meals = [...prev.meals];
      meals[mealIdx] = {
        ...meals[mealIdx],
        ingredients: [...meals[mealIdx].ingredients, emptyIngredient()],
      };
      return { ...prev, meals };
    });
  }

  function removeIngredient(mealIdx: number, ingIdx: number) {
    setForm((prev) => {
      const meals = [...prev.meals];
      const ingredients = meals[mealIdx].ingredients.filter((_, i) => i !== ingIdx);
      meals[mealIdx] = { ...meals[mealIdx], ingredients: ingredients.length ? ingredients : [emptyIngredient()] };
      return { ...prev, meals };
    });
  }

  function addSnack() {
    setForm((prev) => ({
      ...prev,
      meals: [...prev.meals, { label: `Snack ${prev.meals.filter(m => m.type === "snack").length + 1}`, type: "snack" as const, ingredients: [emptyIngredient()] }],
    }));
  }

  function removeMeal(idx: number) {
    if (form.meals.length <= 1) return;
    setForm((prev) => ({ ...prev, meals: prev.meals.filter((_, i) => i !== idx) }));
  }

  // ── Macro Calculations ──────────────────────────────────

  function mealMacros(meal: MealSlot) {
    return meal.ingredients.reduce(
      (acc, ing) => ({
        protein: acc.protein + (Number(ing.protein) || 0),
        carbs: acc.carbs + (Number(ing.carbs) || 0),
        fats: acc.fats + (Number(ing.fats) || 0),
        calories: acc.calories + (Number(ing.calories) || 0),
      }),
      { protein: 0, carbs: 0, fats: 0, calories: 0 },
    );
  }

  const dailyTotals = form.meals.reduce(
    (acc, meal) => {
      const m = mealMacros(meal);
      return {
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats,
        calories: acc.calories + m.calories,
      };
    },
    { protein: 0, carbs: 0, fats: 0, calories: 0 },
  );

  // ── Submit ──────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.name.trim()) {
      toastError("Please enter a plan name");
      return;
    }
    if (!form.created_by.trim()) {
      toastError("Please enter creator name");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        goal: form.goal || "General",
        calories_daily: form.calories_daily,
        created_by: form.created_by,
        content: [{
          day: "Day 1",
          meals: form.meals.map((meal) => ({
            name: meal.label,
            items: meal.ingredients.filter(i => i.name.trim()).map((ing) => ({
              name: ing.name,
              portion: ing.portion,
              calories: Number(ing.calories) || 0,
              protein: Number(ing.protein) || 0,
              carbs: Number(ing.carbs) || 0,
              fat: Number(ing.fats) || 0,
              vitamins: ing.vitamins,
              minerals: ing.minerals,
            })),
          })),
        }],
      };

      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toastSuccess("Meal plan created successfully!");
      router.push("/meal-plans");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setSaving(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="max-w-[900px] mx-auto space-y-6">

      {/* ── SECTION 1: Basic Info ─────────────────────────── */}
      <Card className="p-5">
        <h3 className="font-display text-[20px] text-gold tracking-[0.04em] mb-4">
          PLAN DETAILS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Plan Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Lean Bulk Meal Plan"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Created By</label>
            <input
              type="text"
              value={form.created_by}
              onChange={(e) => setField("created_by", e.target.value)}
              placeholder="Coach name"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>Goal</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setField("goal", g)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors",
                    form.goal === g
                      ? "bg-gold/10 border-gold/40 text-gold"
                      : "bg-charcoal border-steel text-muted hover:text-offwhite hover:border-steel",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Daily Calorie Target</label>
            <input
              type="number"
              value={form.calories_daily}
              onChange={(e) => setField("calories_daily", Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
      </Card>

      {/* ── SECTION 2: Meal Builder ───────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[20px] text-gold tracking-[0.04em]">
            MEALS
          </h3>
          <Button size="sm" variant="secondary" onClick={addSnack}>
            <Plus size={13} />
            Add Snack
          </Button>
        </div>

        {form.meals.map((meal, mealIdx) => {
          const Icon = MEAL_ICONS[meal.type] || UtensilsCrossed;
          const macros = mealMacros(meal);
          const isExpanded = expandedMeal === mealIdx;

          return (
            <Card key={mealIdx} className="overflow-hidden">
              {/* Meal Header */}
              <button
                type="button"
                onClick={() => setExpandedMeal(isExpanded ? -1 : mealIdx)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-iron/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <Icon size={15} className="text-gold" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] text-offwhite font-medium">{meal.label}</p>
                    <p className="font-mono text-[10px] text-muted">
                      {macros.calories} cal &middot; P {macros.protein}g &middot; C {macros.carbs}g &middot; F {macros.fats}g
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {meal.type === "snack" && form.meals.filter(m => m.type === "snack").length > 1 && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); removeMeal(mealIdx); }}
                      className="text-muted hover:text-danger transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
                </div>
              </button>

              {/* Meal Body */}
              {isExpanded && (
                <div className="border-t border-steel px-5 py-4 space-y-3">
                  {/* Column Headers */}
                  <div className="hidden sm:grid grid-cols-[1fr_80px_60px_60px_60px_60px_1fr_1fr_32px] gap-2 px-1">
                    {["Ingredient", "Portion", "Cal", "P(g)", "C(g)", "F(g)", "Vitamins", "Minerals", ""].map((h) => (
                      <span key={h} className="font-mono text-[9px] tracking-wider uppercase text-slate">{h}</span>
                    ))}
                  </div>

                  {/* Ingredient Rows */}
                  {meal.ingredients.map((ing, ingIdx) => (
                    <div key={ingIdx} className="grid grid-cols-2 sm:grid-cols-[1fr_80px_60px_60px_60px_60px_1fr_1fr_32px] gap-2 items-center">
                      <input
                        type="text"
                        placeholder="e.g. Chicken Breast"
                        value={ing.name}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "name", e.target.value)}
                        className={cn(inputClass, "h-[36px] text-[12px] col-span-2 sm:col-span-1")}
                      />
                      <input
                        type="text"
                        placeholder="150g"
                        value={ing.portion}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "portion", e.target.value)}
                        className={cn(numberInputClass, "text-[12px]")}
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={ing.calories || ""}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "calories", Number(e.target.value))}
                        className={cn(numberInputClass, "text-[12px]")}
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={ing.protein || ""}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "protein", Number(e.target.value))}
                        className={cn(numberInputClass, "text-[12px]")}
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={ing.carbs || ""}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "carbs", Number(e.target.value))}
                        className={cn(numberInputClass, "text-[12px]")}
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={ing.fats || ""}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "fats", Number(e.target.value))}
                        className={cn(numberInputClass, "text-[12px]")}
                      />
                      <input
                        type="text"
                        placeholder="Vit A, D..."
                        value={ing.vitamins}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "vitamins", e.target.value)}
                        className={cn(inputClass, "h-[36px] text-[12px]")}
                      />
                      <input
                        type="text"
                        placeholder="Iron, Zinc..."
                        value={ing.minerals}
                        onChange={(e) => updateIngredient(mealIdx, ingIdx, "minerals", e.target.value)}
                        className={cn(inputClass, "h-[36px] text-[12px]")}
                      />
                      <button
                        type="button"
                        onClick={() => removeIngredient(mealIdx, ingIdx)}
                        className="w-8 h-8 flex items-center justify-center text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Add Ingredient */}
                  <button
                    type="button"
                    onClick={() => addIngredient(mealIdx)}
                    className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted hover:text-gold transition-colors mt-2"
                  >
                    <Plus size={12} />
                    Add Ingredient
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── SECTION 3: Daily Summary ──────────────────────── */}
      <Card className="p-5">
        <h3 className="font-display text-[18px] text-gold tracking-[0.04em] mb-4">
          DAILY SUMMARY
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Calories", value: dailyTotals.calories, unit: "kcal", icon: Apple, color: "text-gold" },
            { label: "Protein",  value: dailyTotals.protein,  unit: "g",    icon: Beef, color: "text-danger" },
            { label: "Carbs",    value: dailyTotals.carbs,    unit: "g",    icon: Wheat, color: "text-gold" },
            { label: "Fats",     value: dailyTotals.fats,     unit: "g",    icon: Droplets, color: "text-success" },
          ].map((stat) => {
            const SIcon = stat.icon;
            return (
              <div key={stat.label} className="bg-charcoal border border-steel p-4 text-center">
                <SIcon size={16} className={cn(stat.color, "mx-auto mb-2")} />
                <p className="font-mono text-[10px] uppercase text-muted mb-1">{stat.label}</p>
                <p className={cn("font-display text-[24px] leading-none", stat.color)}>
                  {stat.value}
                </p>
                <p className="font-mono text-[9px] text-slate mt-0.5">{stat.unit}</p>
              </div>
            );
          })}
        </div>

        {/* Macro Ratio Bar */}
        {dailyTotals.calories > 0 && (
          <div className="mt-4">
            <div className="flex h-3 overflow-hidden border border-steel">
              <div
                className="bg-danger/70 transition-all"
                style={{ width: `${((dailyTotals.protein * 4) / dailyTotals.calories) * 100}%` }}
              />
              <div
                className="bg-gold/70 transition-all"
                style={{ width: `${((dailyTotals.carbs * 4) / dailyTotals.calories) * 100}%` }}
              />
              <div
                className="bg-success/70 transition-all"
                style={{ width: `${((dailyTotals.fats * 9) / dailyTotals.calories) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="font-mono text-[9px] text-danger">Protein {Math.round((dailyTotals.protein * 4 / Math.max(dailyTotals.calories, 1)) * 100)}%</span>
              <span className="font-mono text-[9px] text-gold">Carbs {Math.round((dailyTotals.carbs * 4 / Math.max(dailyTotals.calories, 1)) * 100)}%</span>
              <span className="font-mono text-[9px] text-success">Fats {Math.round((dailyTotals.fats * 9 / Math.max(dailyTotals.calories, 1)) * 100)}%</span>
            </div>
          </div>
        )}
      </Card>

      {/* ── SECTION 4: Notes ──────────────────────────────── */}
      <Card className="p-5">
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Additional instructions, dietary notes, allergies..."
          rows={3}
          className={cn(inputClass, "h-auto py-2.5 resize-y")}
        />
      </Card>

      {/* ── SUBMIT ────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Create Meal Plan"}
        </Button>
      </div>
    </div>
  );
}
