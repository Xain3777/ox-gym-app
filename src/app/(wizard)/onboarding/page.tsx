"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// ── Constants ──────────────────────────────────────────────────
const TOTAL_STEPS = 7;
const ITEM_H = 56;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 66 }, (_, i) => String(2010 - i));
const KG_INT = Array.from({ length: 171 }, (_, i) => String(i + 30));
const KG_DEC = ["0","1","2","3","4","5","6","7","8","9"];
const LB_INT = Array.from({ length: 331 }, (_, i) => String(i + 66));
const CM_VAL = Array.from({ length: 151 }, (_, i) => String(i + 100));
const FT_VAL = Array.from({ length: 36 }, (_, i) => {
  const totalIn = i + 48;
  return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`;
});

const ILLNESSES = ["asthma","diabetes","heartCondition","highBloodPressure","epilepsy","thyroid","anemia"] as const;
const INJURIES  = ["backPain","kneePain","shoulderImpingement","acl","herniatedDisc","ankleSprain","wristPain","hipPain"] as const;

// ── Scroll Picker ──────────────────────────────────────────────
function ScrollPicker({
  items,
  value,
  onChange,
  width = "flex-1",
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [selIdx, setSelIdx] = useState(() => Math.max(0, items.indexOf(value)));
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const idx = Math.max(0, items.indexOf(value));
    if (ref.current) ref.current.scrollTop = idx * ITEM_H;
    setSelIdx(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = useCallback(() => {
    if (!ref.current) return;
    const raw = Math.round(ref.current.scrollTop / ITEM_H);
    const idx = Math.max(0, Math.min(raw, items.length - 1));
    setSelIdx(idx);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      ref.current?.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      onChange(items[idx]);
    }, 120);
  }, [items, onChange]);

  return (
    <div className={cn("relative overflow-hidden", width)} style={{ height: ITEM_H * 3 }}>
      {/* selection band */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10 border-t border-b border-gold/40"
        style={{ top: ITEM_H, height: ITEM_H }}
      />
      {/* fade top */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-10"
        style={{ height: ITEM_H, background: "linear-gradient(to bottom, #0A0A0A 30%, transparent)" }}
      />
      {/* fade bottom */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
        style={{ height: ITEM_H, background: "linear-gradient(to top, #0A0A0A 30%, transparent)" }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        <div style={{ height: ITEM_H }} />
        {items.map((item, i) => (
          <div
            key={item}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            className="flex items-center justify-center cursor-pointer select-none"
            onClick={() => {
              ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
              setSelIdx(i);
              onChange(item);
            }}
          >
            <span
              className={cn(
                "transition-all duration-150 font-medium",
                i === selIdx
                  ? "text-white text-[26px] font-bold"
                  : Math.abs(i - selIdx) === 1
                  ? "text-white/35 text-[20px]"
                  : "text-white/15 text-[17px]",
              )}
            >
              {item}
            </span>
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}

// ── Single-select card ─────────────────────────────────────────
function SelectCard({
  title,
  subtitle,
  selected,
  onClick,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-5 py-4 border-2 transition-all duration-150",
        selected
          ? "border-gold/70 bg-gold/[0.06]"
          : "border-steel bg-iron/60 hover:border-steel/80",
      )}
    >
      <p className={cn("font-semibold text-[16px]", selected ? "text-white" : "text-white/80")}>
        {title}
      </p>
      {subtitle && (
        <p className="text-white/45 text-[13px] mt-0.5 leading-snug">{subtitle}</p>
      )}
    </button>
  );
}

// ── Multi-select card ──────────────────────────────────────────
function MultiCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-5 py-4 border-2 transition-all duration-150 flex items-center gap-3",
        selected
          ? "border-gold/70 bg-gold/[0.06]"
          : "border-steel bg-iron/60 hover:border-steel/80",
      )}
    >
      <div
        className={cn(
          "w-5 h-5 border-2 flex-shrink-0 flex items-center justify-center transition-all",
          selected ? "border-gold bg-gold" : "border-steel",
        )}
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={cn("font-medium text-[15px]", selected ? "text-white" : "text-white/70")}>
        {label}
      </span>
    </button>
  );
}

// ── Unit toggle ────────────────────────────────────────────────
function UnitToggle({
  options,
  value,
  onChange,
}: {
  options: [string, string];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex w-48 mx-auto bg-iron border border-steel overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 py-2.5 text-[13px] font-bold uppercase tracking-wider transition-all",
            value === opt
              ? "bg-gold text-void"
              : "text-white/40 hover:text-white/60",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function OnboardingPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 – Goal
  const [fitnessGoal, setFitnessGoal] = useState("");

  // Step 2 – Level
  const [level, setLevel] = useState("");

  // Step 3 – Illnesses
  const [illnesses, setIllnesses] = useState<Set<string>>(new Set());

  // Step 4 – Injuries
  const [injuries, setInjuries] = useState<Set<string>>(new Set());

  // Step 5 – Personal (DOB + Gender)
  const [dobMonth, setDobMonth] = useState("January");
  const [dobDay,   setDobDay]   = useState("01");
  const [dobYear,  setDobYear]  = useState("2000");
  const [gender,   setGender]   = useState("");

  // Step 6 – Weight
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [weightInt,  setWeightInt]  = useState("70");
  const [weightDec,  setWeightDec]  = useState("0");

  // Step 7 – Height
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft/in">("cm");
  const [heightVal,  setHeightVal]  = useState("170");

  function toggleMulti(set: Set<string>, val: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  }

  function canProceed() {
    switch (step) {
      case 1: return !!fitnessGoal;
      case 2: return !!level;
      case 3: return true;
      case 4: return true;
      case 5: return !!gender;
      case 6: return true;
      case 7: return true;
      default: return false;
    }
  }

  async function handleFinish() {
    setLoading(true);
    const monthIdx = MONTHS.indexOf(dobMonth) + 1;
    const dob = `${dobYear}-${String(monthIdx).padStart(2, "0")}-${dobDay}`;

    const weightKg =
      weightUnit === "kg"
        ? parseFloat(`${weightInt}.${weightDec}`)
        : parseFloat(weightInt) / 2.20462;

    const heightCm =
      heightUnit === "cm"
        ? parseInt(heightVal, 10)
        : (() => {
            const match = heightVal.match(/(\d+)′(\d+)″/);
            if (!match) return 170;
            return Math.round((parseInt(match[1]) * 12 + parseInt(match[2])) * 2.54);
          })();

    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fitness_goal: fitnessGoal,
        training_level: level,
        illnesses: Array.from(illnesses),
        injuries: Array.from(injuries),
        date_of_birth: dob,
        gender,
        weight_kg: Math.round(weightKg * 10) / 10,
        height_cm: heightCm,
      }),
    });

    if (res.ok) {
      window.location.href = "/portal";
    } else {
      setLoading(false);
    }
  }

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else handleFinish();
  }

  const goalOptions = [
    { key: "hypertrophy",       title: t("onboarding.goal_hypertrophy"),       sub: t("onboarding.goal_hypertrophySub") },
    { key: "muscle_definition", title: t("onboarding.goal_muscleDefinition"),   sub: t("onboarding.goal_muscleDefinitionSub") },
    { key: "lose_weight",       title: t("onboarding.goal_loseWeight"),         sub: t("onboarding.goal_loseWeightSub") },
  ];

  const levelOptions = [
    { key: "beginner",     title: t("onboarding.level_beginner"),     sub: t("onboarding.level_beginnerSub") },
    { key: "intermediate", title: t("onboarding.level_intermediate"), sub: t("onboarding.level_intermediateSub") },
    { key: "advanced",     title: t("onboarding.level_advanced"),     sub: t("onboarding.level_advancedSub") },
  ];

  return (
    <div className="min-h-screen bg-void flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 pt-14 pb-4">
        <div className="relative flex items-center mb-5">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="absolute left-0 text-white/60 hover:text-white transition-colors p-1"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
          )}
          <h1 className="w-full text-center text-white font-semibold text-[17px] tracking-wide">
            {t("onboarding.myProfile")}
          </h1>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/[0.08] overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pt-2 pb-6 overflow-y-auto">

        {/* ── STEP 1: Goal ── */}
        {step === 1 && (
          <div>
            <h2 className="text-white text-[26px] font-bold mb-1">{t("onboarding.goalTitle")}</h2>
            <p className="text-white/45 text-[14px] mb-6">{t("onboarding.goalSub")}</p>
            <div className="space-y-3">
              {goalOptions.map((opt) => (
                <SelectCard
                  key={opt.key}
                  title={opt.title}
                  subtitle={opt.sub}
                  selected={fitnessGoal === opt.key}
                  onClick={() => setFitnessGoal(opt.key)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Level ── */}
        {step === 2 && (
          <div>
            <h2 className="text-white text-[26px] font-bold mb-1">{t("onboarding.levelTitle")}</h2>
            <p className="text-white/45 text-[14px] mb-6">{t("onboarding.levelSub")}</p>
            <div className="space-y-3">
              {levelOptions.map((opt) => (
                <SelectCard
                  key={opt.key}
                  title={opt.title}
                  subtitle={opt.sub}
                  selected={level === opt.key}
                  onClick={() => setLevel(opt.key)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Illnesses ── */}
        {step === 3 && (
          <div>
            <h2 className="text-white text-[26px] font-bold mb-1">{t("onboarding.healthTitle")}</h2>
            <p className="text-white/45 text-[14px] mb-6">{t("onboarding.healthSub")}</p>
            <div className="space-y-2.5">
              {ILLNESSES.map((item) => (
                <MultiCard
                  key={item}
                  label={t(`onboarding.illness_${item}`)}
                  selected={illnesses.has(item)}
                  onClick={() => toggleMulti(illnesses, item, setIllnesses)}
                />
              ))}
              <MultiCard
                label={t("onboarding.noneOfAbove")}
                selected={illnesses.size === 0}
                onClick={() => setIllnesses(new Set())}
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Injuries ── */}
        {step === 4 && (
          <div>
            <h2 className="text-white text-[26px] font-bold mb-1">{t("onboarding.injuriesTitle")}</h2>
            <p className="text-white/45 text-[14px] mb-6">{t("onboarding.injuriesSub")}</p>
            <div className="space-y-2.5">
              {INJURIES.map((item) => (
                <MultiCard
                  key={item}
                  label={t(`onboarding.injury_${item}`)}
                  selected={injuries.has(item)}
                  onClick={() => toggleMulti(injuries, item, setInjuries)}
                />
              ))}
              <MultiCard
                label={t("onboarding.noneOfAbove")}
                selected={injuries.size === 0}
                onClick={() => setInjuries(new Set())}
              />
            </div>
          </div>
        )}

        {/* ── STEP 5: DOB + Gender ── */}
        {step === 5 && (
          <div>
            <h2 className="text-white text-[26px] font-bold mb-1">{t("onboarding.dobTitle")}</h2>
            <p className="text-white/45 text-[14px] mb-8">{t("onboarding.dobSub")}</p>

            {/* DOB scroll pickers */}
            <div className="flex gap-2 mb-8">
              <ScrollPicker items={MONTHS} value={dobMonth} onChange={setDobMonth} width="flex-[2]" />
              <ScrollPicker items={DAYS}   value={dobDay}   onChange={setDobDay}   width="flex-1" />
              <ScrollPicker items={YEARS}  value={dobYear}  onChange={setDobYear}  width="flex-1" />
            </div>

            {/* Gender */}
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted mb-3">
              {t("onboarding.gender")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={cn(
                    "py-4 border-2 text-[14px] font-bold uppercase tracking-wider transition-all",
                    gender === g
                      ? "border-gold/70 bg-gold/[0.06] text-gold"
                      : "border-steel bg-iron/60 text-white/40 hover:border-steel/80",
                  )}
                >
                  {t(`onboarding.${g}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 6: Weight ── */}
        {step === 6 && (
          <div>
            <h2 className="text-white text-[26px] font-bold mb-1">{t("onboarding.weightTitle")}</h2>
            <p className="text-white/45 text-[14px] mb-6">{t("onboarding.weightSub")}</p>

            <div className="mb-6">
              <UnitToggle
                options={["kg", "lb"]}
                value={weightUnit}
                onChange={(v) => setWeightUnit(v as "kg" | "lb")}
              />
            </div>

            {weightUnit === "kg" ? (
              <div className="flex items-center gap-3">
                <ScrollPicker items={KG_INT} value={weightInt} onChange={setWeightInt} width="flex-1" />
                <span className="text-white/30 text-[28px] font-bold pb-1">.</span>
                <ScrollPicker items={KG_DEC} value={weightDec} onChange={setWeightDec} width="w-16" />
                <span className="text-white/50 text-[16px] font-mono pb-1">kg</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ScrollPicker items={LB_INT} value={weightInt} onChange={setWeightInt} width="flex-1" />
                <span className="text-white/50 text-[16px] font-mono pb-1">lb</span>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 7: Height ── */}
        {step === 7 && (
          <div>
            <h2 className="text-white text-[26px] font-bold mb-1">{t("onboarding.heightTitle")}</h2>
            <p className="text-white/45 text-[14px] mb-6">{t("onboarding.heightSub")}</p>

            <div className="mb-6">
              <UnitToggle
                options={["cm", "ft/in"]}
                value={heightUnit}
                onChange={(v) => {
                  setHeightUnit(v as "cm" | "ft/in");
                  setHeightVal(v === "cm" ? "170" : "5′7″");
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <ScrollPicker
                items={heightUnit === "cm" ? CM_VAL : FT_VAL}
                value={heightVal}
                onChange={setHeightVal}
                width="flex-1"
              />
              <span className="text-white/50 text-[16px] font-mono pb-1">
                {heightUnit === "cm" ? "cm" : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-10 pt-2 space-y-3">
        <button
          onClick={next}
          disabled={!canProceed() || loading}
          className={cn(
            "w-full py-4 text-[16px] font-bold tracking-wider transition-all",
            canProceed() && !loading
              ? "bg-gold text-void hover:bg-gold-high active:scale-[0.98]"
              : "bg-white/[0.06] text-white/20 cursor-not-allowed",
          )}
        >
          {loading
            ? t("common.loading")
            : step === 1
            ? t("onboarding.start")
            : step === TOTAL_STEPS
            ? t("onboarding.finish")
            : t("onboarding.continue")}
        </button>

        {step === 1 && (
          <Link
            href="/login"
            className="block w-full py-4 text-center text-[15px] font-semibold text-gold border border-gold/40 hover:border-gold/70 transition-colors"
          >
            {t("onboarding.alreadyHaveAccount")}
          </Link>
        )}
      </div>
    </div>
  );
}
