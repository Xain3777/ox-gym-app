"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { OxCheck } from "@/components/icons/OxIcons";

const TOTAL_STEPS = 5;

const ILLNESSES = [
  "asthma", "diabetes", "heartCondition", "highBloodPressure",
  "epilepsy", "thyroid", "anemia",
] as const;

const INJURIES = [
  "backPain", "kneePain", "shoulderImpingement", "acl",
  "herniatedDisc", "ankleSprain", "wristPain", "hipPain",
] as const;

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Personal
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  // Step 2: Health
  const [illnesses, setIllnesses] = useState<Set<string>>(new Set());

  // Step 3: Injuries
  const [injuries, setInjuries] = useState<Set<string>>(new Set());

  // Step 4: Level & Goal
  const [level, setLevel] = useState("");
  const [weightGoal, setWeightGoal] = useState("");

  // Step 5: Nutrition
  const [wantsMealPlan, setWantsMealPlan] = useState<boolean | null>(null);
  const [takesSupplements, setTakesSupplements] = useState<boolean | null>(null);
  const [takesPreworkout, setTakesPreworkout] = useState<boolean | null>(null);

  function toggleSet(set: Set<string>, value: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  }

  function canProceed() {
    switch (step) {
      case 1: return dob && gender;
      case 2: return true; // illnesses optional
      case 3: return true; // injuries optional
      case 4: return level && weightGoal;
      case 5: return wantsMealPlan !== null && takesSupplements !== null && takesPreworkout !== null;
      default: return false;
    }
  }

  async function handleFinish() {
    setLoading(true);
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date_of_birth: dob,
        gender,
        illnesses: Array.from(illnesses),
        injuries: Array.from(injuries),
        training_level: level,
        weight_goal: weightGoal,
        wants_meal_plan: wantsMealPlan,
        takes_supplements: takesSupplements,
        takes_preworkout: takesPreworkout,
      }),
    });
    if (res.ok) {
      window.location.href = "/portal";
    } else {
      setLoading(false);
    }
  }

  function next() {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleFinish();
  }

  return (
    <div className="p-6 flex flex-col min-h-[480px]">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-300",
            i < step ? "bg-gold" : "bg-white/[0.08]"
          )} />
        ))}
      </div>
      <p className="text-white/30 text-[12px] font-mono mb-6">
        {step}/{TOTAL_STEPS}
      </p>

      {/* Steps */}
      <div className="flex-1">
        {step === 1 && (
          <StepContainer title={t("onboarding.personalTitle")} subtitle={t("onboarding.personalSub")}>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
                  {t("onboarding.dateOfBirth")}
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] focus:border-gold focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
                  {t("onboarding.gender")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={cn(
                        "py-4 border-2 text-[15px] font-bold uppercase tracking-wider transition-all",
                        gender === g
                          ? "bg-gold/10 border-gold/50 text-gold"
                          : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:border-white/20"
                      )}
                    >
                      {t(`onboarding.${g}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StepContainer>
        )}

        {step === 2 && (
          <StepContainer title={t("onboarding.healthTitle")} subtitle={t("onboarding.healthSub")}>
            <div className="flex flex-wrap gap-2">
              {ILLNESSES.map((item) => (
                <ChipToggle
                  key={item}
                  label={t(`onboarding.illness_${item}`)}
                  active={illnesses.has(item)}
                  onClick={() => toggleSet(illnesses, item, setIllnesses)}
                />
              ))}
              <ChipToggle
                label={t("onboarding.noneOfAbove")}
                active={illnesses.size === 0}
                onClick={() => setIllnesses(new Set())}
              />
            </div>
          </StepContainer>
        )}

        {step === 3 && (
          <StepContainer title={t("onboarding.injuriesTitle")} subtitle={t("onboarding.injuriesSub")}>
            <div className="flex flex-wrap gap-2">
              {INJURIES.map((item) => (
                <ChipToggle
                  key={item}
                  label={t(`onboarding.injury_${item}`)}
                  active={injuries.has(item)}
                  onClick={() => toggleSet(injuries, item, setInjuries)}
                />
              ))}
              <ChipToggle
                label={t("onboarding.noneOfAbove")}
                active={injuries.size === 0}
                onClick={() => setInjuries(new Set())}
              />
            </div>
          </StepContainer>
        )}

        {step === 4 && (
          <StepContainer title={t("onboarding.fitnessTitle")} subtitle={t("onboarding.fitnessSub")}>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
                  {t("onboarding.trainingLevel")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["beginner", "advanced"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={cn(
                        "py-4 border-2 transition-all",
                        level === l
                          ? "bg-gold/10 border-gold/50 text-gold"
                          : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:border-white/20"
                      )}
                    >
                      <p className="text-[15px] font-bold uppercase tracking-wider">{t(`onboarding.level_${l}`)}</p>
                      <p className="text-[11px] mt-1 opacity-60">{t(`onboarding.level_${l}Sub`)}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
                  {t("onboarding.weightGoal")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["lose", "maintain", "gain"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setWeightGoal(g)}
                      className={cn(
                        "py-4 border-2 transition-all",
                        weightGoal === g
                          ? "bg-gold/10 border-gold/50 text-gold"
                          : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:border-white/20"
                      )}
                    >
                      <p className="text-[14px] font-bold uppercase tracking-wider">{t(`onboarding.goal_${g}`)}</p>
                      <p className="text-[10px] mt-1 opacity-60">{t(`onboarding.goal_${g}Sub`)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StepContainer>
        )}

        {step === 5 && (
          <StepContainer title={t("onboarding.nutritionTitle")} subtitle={t("onboarding.nutritionSub")}>
            <div className="space-y-5">
              <YesNoQuestion
                label={t("onboarding.wantMealPlan")}
                value={wantsMealPlan}
                onChange={setWantsMealPlan}
              />
              <YesNoQuestion
                label={t("onboarding.takeSupplements")}
                value={takesSupplements}
                onChange={setTakesSupplements}
              />
              <YesNoQuestion
                label={t("onboarding.takePreworkout")}
                value={takesPreworkout}
                onChange={setTakesPreworkout}
              />
            </div>
          </StepContainer>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="px-6 py-3.5 border border-white/[0.1] text-white/50 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors"
          >
            {t("common.back")}
          </button>
        )}
        <button
          onClick={next}
          disabled={!canProceed() || loading}
          className={cn(
            "flex-1 py-3.5 text-[14px] font-bold uppercase tracking-wider transition-all",
            canProceed() && !loading
              ? "bg-gold text-void hover:bg-gold-high active:scale-[0.98]"
              : "bg-white/[0.06] text-white/20 cursor-not-allowed"
          )}
        >
          {loading ? t("common.loading") : step === TOTAL_STEPS ? t("onboarding.finish") : t("onboarding.continue")}
        </button>
      </div>
    </div>
  );
}

function StepContainer({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-[26px] tracking-[0.04em] text-white leading-none mb-1">{title}</h2>
      <p className="text-[13px] text-muted mb-6">{subtitle}</p>
      {children}
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 text-[13px] font-medium border transition-all flex items-center gap-2",
        active
          ? "bg-gold/10 border-gold/40 text-gold"
          : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:border-white/20"
      )}
    >
      {active && <OxCheck size={14} />}
      {label}
    </button>
  );
}

function YesNoQuestion({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-white text-[15px] font-medium mb-3">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange(true)}
          className={cn(
            "py-3 border-2 text-[14px] font-bold transition-all",
            value === true
              ? "bg-gold/10 border-gold/50 text-gold"
              : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:border-white/20"
          )}
        >
          {t("common.yes")}
        </button>
        <button
          onClick={() => onChange(false)}
          className={cn(
            "py-3 border-2 text-[14px] font-bold transition-all",
            value === false
              ? "bg-gold/10 border-gold/50 text-gold"
              : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:border-white/20"
          )}
        >
          {t("common.no")}
        </button>
      </div>
    </div>
  );
}
