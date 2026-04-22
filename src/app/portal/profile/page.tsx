"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxCheck, OxShield, OxHeart, OxTarget, OxDumbbell, OxFlame } from "@/components/icons/OxIcons";
import { createBrowserSupabase } from "@/lib/supabase";

const WIZARD_DRAFT_KEY = "profile_wizard_draft";

// ── CONDITIONS / INJURIES ──────────────────────────────────────
const COMMON_CONDITIONS = [
  "Asthma", "Diabetes (Type 1)", "Diabetes (Type 2)",
  "High Blood Pressure", "Heart Condition", "Epilepsy",
  "Thyroid Disorder", "Chronic Fatigue", "None",
];

const COMMON_INJURIES = [
  "Lower Back Pain", "Knee Injury (ACL/MCL)", "Shoulder Impingement",
  "Herniated Disc", "Rotator Cuff Tear", "Ankle Sprain (Chronic)",
  "Tennis / Golfer's Elbow", "Wrist / Carpal Tunnel", "Hip Flexor Strain", "None",
];

const CONDITIONS_AR: Record<string, string> = {
  "Asthma": "الربو", "Diabetes (Type 1)": "السكري (النوع الأول)",
  "Diabetes (Type 2)": "السكري (النوع الثاني)", "High Blood Pressure": "ضغط الدم المرتفع",
  "Heart Condition": "أمراض القلب", "Epilepsy": "الصرع",
  "Thyroid Disorder": "اضطراب الغدة الدرقية", "Chronic Fatigue": "التعب المزمن", "None": "لا شيء",
};

const INJURIES_AR: Record<string, string> = {
  "Lower Back Pain": "ألم أسفل الظهر", "Knee Injury (ACL/MCL)": "إصابة الركبة (ACL/MCL)",
  "Shoulder Impingement": "ضغط الكتف", "Herniated Disc": "انزلاق غضروفي",
  "Rotator Cuff Tear": "تمزق كفة الروتاتور", "Ankle Sprain (Chronic)": "التواء الكاحل (مزمن)",
  "Tennis / Golfer's Elbow": "كوع التنس / الجولف", "Wrist / Carpal Tunnel": "إصابة المعصم / النفق الرسغي",
  "Hip Flexor Strain": "شد عضلة الورك", "None": "لا شيء",
};

type ProfileSnapshot = {
  firstName: string; lastName: string; birthday: string; phone: string;
  illnesses: string[]; injuries: string[];
  level: "normal" | "advanced"; goal: "maintain" | "lose" | "gain"; outcome: "muscle" | "health";
};

// ── WIZARD ────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { id: "welcome" },
  { id: "conditions" },
  { id: "injuries" },
  { id: "training" },
  { id: "outcome" },
];

function ProfileWizard({
  firstName,
  selectedIllnesses, setSelectedIllnesses,
  selectedInjuries,  setSelectedInjuries,
  level, setLevel,
  goal,  setGoal,
  outcome, setOutcome,
  onComplete,
}: {
  firstName: string;
  selectedIllnesses: string[]; setSelectedIllnesses: (v: string[]) => void;
  selectedInjuries: string[];  setSelectedInjuries: (v: string[]) => void;
  level: "normal" | "advanced"; setLevel: (v: "normal" | "advanced") => void;
  goal: "maintain" | "lose" | "gain"; setGoal: (v: "maintain" | "lose" | "gain") => void;
  outcome: "muscle" | "health"; setOutcome: (v: "muscle" | "health") => void;
  onComplete: () => void;
}) {
  const [saving, setSaving] = useState(false);

  // Restore step from draft on mount
  const [step, setStep] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(WIZARD_DRAFT_KEY) ?? "{}");
      return typeof draft.step === "number" ? draft.step : 0;
    } catch { return 0; }
  });

  // Restore selections from draft on mount (one-time via ref guard)
  const draftRestored = useRef(false);
  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    try {
      const draft = JSON.parse(localStorage.getItem(WIZARD_DRAFT_KEY) ?? "{}");
      if (Array.isArray(draft.illnesses) && draft.illnesses.length) setSelectedIllnesses(draft.illnesses);
      if (Array.isArray(draft.injuries)  && draft.injuries.length)  setSelectedInjuries(draft.injuries);
      if (draft.level)   setLevel(draft.level);
      if (draft.goal)    setGoal(draft.goal);
      if (draft.outcome) setOutcome(draft.outcome);
    } catch { /* ignore */ }
  }, []);

  // Persist draft whenever wizard state changes
  useEffect(() => {
    try {
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify({
        step, illnesses: selectedIllnesses, injuries: selectedInjuries, level, goal, outcome,
      }));
    } catch { /* ignore storage errors */ }
  }, [step, selectedIllnesses, selectedInjuries, level, goal, outcome]);

  function toggleCondition(item: string) {
    if (item === "None") { setSelectedIllnesses(["None"]); return; }
    const without = selectedIllnesses.filter((i) => i !== "None");
    if (without.includes(item)) {
      const next = without.filter((i) => i !== item);
      setSelectedIllnesses(next.length === 0 ? ["None"] : next);
    } else { setSelectedIllnesses([...without, item]); }
  }

  function toggleInjury(item: string) {
    if (item === "None") { setSelectedInjuries(["None"]); return; }
    const without = selectedInjuries.filter((i) => i !== "None");
    if (without.includes(item)) {
      const next = without.filter((i) => i !== item);
      setSelectedInjuries(next.length === 0 ? ["None"] : next);
    } else { setSelectedInjuries([...without, item]); }
  }

  async function handleFinish() {
    setSaving(true);
    await onComplete();
    setSaving(false);
  }

  const isLast = step === WIZARD_STEPS.length - 1;
  const totalSteps = WIZARD_STEPS.length - 1; // exclude welcome

  return (
    <div className="fixed inset-0 z-50 bg-[#070707] flex flex-col" dir="rtl">
      {/* Top bar */}
      <div className="relative flex-shrink-0 px-5 pt-10 pb-4">
        <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-60" />

        {/* OX Logo */}
        <div className="flex items-center justify-between mb-5">
          <div className="text-[11px] font-mono text-white/30 uppercase tracking-[0.2em]">OX GYM</div>
          {step > 0 && (
            <button
              onClick={() => setStep((s: number) => s - 1)}
              className="text-white/30 text-[13px] hover:text-white/60 transition-colors"
            >
              السابق
            </button>
          )}
        </div>

        {/* Progress dots (only after welcome) */}
        {step > 0 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-[3px] flex-1 transition-all duration-300",
                  i < step ? "bg-gold" : "bg-white/10"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">

        {/* ── STEP 0: Welcome ── */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-6">
            <div className="relative w-32 h-40">
              <Image src="/fig-bicep.png" alt="" fill className="object-contain" unoptimized />
            </div>
            <div>
              <p className="text-white/40 text-[11px] font-mono uppercase tracking-[0.2em] mb-2">
                الملف الشخصي
              </p>
              <h1 className="text-gold font-display text-[38px] tracking-wider leading-none">
                أهلاً، {firstName}
              </h1>
              <div className="w-14 h-[4px] danger-tape-thin mx-auto mt-3 mb-5" />
              <p className="text-white/50 text-[15px] leading-relaxed max-w-xs mx-auto">
                لنبدأ بإعداد ملفك الصحي حتى يتمكن المدربون من تصميم برنامج مناسب لك.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 1: Health Conditions ── */}
        {step === 1 && (
          <div className="pt-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <OxHeart size={16} className="text-danger" />
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em]">الصحة</p>
              </div>
              <h2 className="text-white font-display text-[28px] tracking-wider leading-tight">
                هل تعاني من أي حالات طبية؟
              </h2>
              <p className="text-white/30 text-[13px] mt-2 leading-relaxed">
                هذه المعلومات تساعد مدربك على تصميم برنامج آمن لك.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMMON_CONDITIONS.map((item) => {
                const active = selectedIllnesses.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleCondition(item)}
                    className={cn(
                      "px-4 py-2.5 text-[14px] font-medium border-2 transition-all duration-200",
                      active
                        ? "bg-danger/15 border-danger/50 text-danger"
                        : "bg-white/[0.03] border-white/[0.10] text-white/50 hover:border-white/20 hover:text-white/70"
                    )}
                  >
                    {active && <span className="ml-1.5 text-danger">✓ </span>}
                    {CONDITIONS_AR[item] ?? item}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Injuries ── */}
        {step === 2 && (
          <div className="pt-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <OxShield size={16} className="text-[#FF6B35]" />
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em]">الإصابات</p>
              </div>
              <h2 className="text-white font-display text-[28px] tracking-wider leading-tight">
                هل لديك إصابات سابقة أو مزمنة؟
              </h2>
              <p className="text-white/30 text-[13px] mt-2 leading-relaxed">
                حدّد المناطق التي تحتاج الاهتمام لنتجنب تفاقم أي إصابة.
              </p>
            </div>

            {/* Body diagram hint */}
            <div className="relative bg-white/[0.02] border border-white/[0.06] overflow-hidden p-4">
              <div className="absolute top-0 left-0 right-0 h-[3px] opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg,#FF6B35 0px,#FF6B35 6px,transparent 6px,transparent 12px)" }} />
              <div className="absolute left-2 top-2 bottom-2 w-16 opacity-25">
                <Image src="/fig-charge.png" alt="" fill className="object-contain" unoptimized />
              </div>
              <div className="flex flex-wrap gap-2 mr-16">
                {COMMON_INJURIES.map((item) => {
                  const active = selectedInjuries.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleInjury(item)}
                      className={cn(
                        "px-3 py-2 text-[13px] font-medium border-2 transition-all duration-200",
                        active
                          ? "bg-[#FF6B35]/15 border-[#FF6B35]/50 text-[#FF6B35]"
                          : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/60"
                      )}
                    >
                      {active && <span className="ml-1">✓ </span>}
                      {INJURIES_AR[item] ?? item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Training Level + Goal ── */}
        {step === 3 && (
          <div className="pt-4 space-y-7">
            {/* Level */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <OxDumbbell size={16} className="text-gold" />
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em]">المستوى</p>
                </div>
                <h2 className="text-white font-display text-[26px] tracking-wider leading-tight">
                  ما هو مستواك التدريبي؟
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["normal", "advanced"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "relative p-5 border-2 text-right transition-all duration-200 overflow-hidden",
                      level === l
                        ? l === "normal" ? "bg-gold/10 border-gold/50" : "bg-danger/10 border-danger/40"
                        : "bg-white/[0.02] border-white/[0.08] hover:border-white/20"
                    )}
                  >
                    {level === l && (
                      <div className={cn("absolute top-0 left-0 right-0 h-[3px]", l === "normal" ? "bg-gold/50" : "bg-danger/50")} />
                    )}
                    <p className={cn("font-display text-[22px] tracking-wider leading-none mb-1",
                      level === l ? l === "normal" ? "text-gold" : "text-danger" : "text-white/50"
                    )}>
                      {l === "normal" ? "عادي" : "متقدم"}
                    </p>
                    <p className={cn("text-[12px]", level === l ? "text-white/50" : "text-white/25")}>
                      {l === "normal" ? "مبتدئ أو متوسط" : "خبرة 2+ سنوات"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <OxTarget size={16} className="text-gold" />
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em]">الهدف</p>
                </div>
                <h2 className="text-white font-display text-[26px] tracking-wider leading-tight">
                  ما هدفك من التمرين؟
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { k: "lose",     icon: <OxFlame size={24} />,   label: "تخسيس",  sub: "حرق دهون" },
                  { k: "maintain", icon: <OxTarget size={24} />,  label: "تثبيت",  sub: "الحفاظ" },
                  { k: "gain",     icon: <OxDumbbell size={24} />, label: "تضخيم", sub: "بناء عضل" },
                ] as const).map(({ k, icon, label, sub }) => (
                  <button
                    key={k}
                    onClick={() => setGoal(k)}
                    className={cn(
                      "flex flex-col items-center p-4 border-2 text-center transition-all duration-200",
                      goal === k ? "bg-gold/10 border-gold/50" : "bg-white/[0.02] border-white/[0.08] hover:border-white/20"
                    )}
                  >
                    <div className={cn("mb-3 transition-colors", goal === k ? "text-gold" : "text-white/25")}>{icon}</div>
                    <p className={cn("font-display text-[16px] tracking-wider leading-none mb-1", goal === k ? "text-gold" : "text-white/50")}>{label}</p>
                    <p className={cn("text-[11px]", goal === k ? "text-white/40" : "text-white/20")}>{sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Outcome ── */}
        {step === 4 && (
          <div className="pt-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <OxFlame size={16} className="text-danger" />
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em]">الدافع</p>
              </div>
              <h2 className="text-white font-display text-[28px] tracking-wider leading-tight">
                ما الذي يحفزك؟
              </h2>
              <p className="text-white/30 text-[13px] mt-2">
                اختر النتيجة الأساسية التي تسعى إليها.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {([
                { k: "muscle", icon: <OxDumbbell size={32} />, label: "بناء القوة",  sub: "ضخامة وقوة وأداء رياضي" },
                { k: "health", icon: <OxHeart size={32} />,    label: "الصحة العامة", sub: "لياقة، راحة، وعافية مستدامة" },
              ] as const).map(({ k, icon, label, sub }) => (
                <button
                  key={k}
                  onClick={() => setOutcome(k)}
                  className={cn(
                    "relative flex items-center gap-5 p-6 border-2 text-right transition-all duration-200 overflow-hidden",
                    outcome === k ? "bg-gold/10 border-gold/50" : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                  )}
                >
                  {outcome === k && <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-60" />}
                  <div className={cn(
                    "w-16 h-16 flex items-center justify-center border-2 flex-shrink-0 transition-all",
                    outcome === k ? "bg-gold/15 border-gold/40 text-gold" : "bg-white/[0.04] border-white/[0.08] text-white/20"
                  )}>
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-display text-[22px] tracking-wider leading-none mb-1.5", outcome === k ? "text-gold" : "text-white/60")}>
                      {label}
                    </p>
                    <p className={cn("text-[13px] leading-relaxed", outcome === k ? "text-white/50" : "text-white/25")}>
                      {sub}
                    </p>
                  </div>
                  {outcome === k && <OxCheck size={20} className="text-gold flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="flex-shrink-0 px-5 pb-8 pt-4 border-t border-white/[0.06]">
        <button
          onClick={() => {
            if (isLast) { handleFinish(); }
            else { setStep((s: number) => s + 1); }
          }}
          disabled={saving}
          className={cn(
            "w-full font-bold text-[16px] py-4 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest",
            isLast
              ? "bg-gold hover:bg-yellow-400 text-[#0A0A0A]"
              : "bg-white/[0.06] hover:bg-white/[0.10] text-white border border-white/[0.10]"
          )}
          style={{ minHeight: "56px" }}
        >
          {saving ? "جاري الحفظ..." : isLast ? (
            <><OxCheck size={20} />حفظ الملف</>
          ) : step === 0 ? (
            "ابدأ الآن →"
          ) : (
            "التالي →"
          )}
        </button>
        {step === 0 && (
          <button
            onClick={() => {
              localStorage.setItem("profile_onboarded", "1");
              localStorage.removeItem(WIZARD_DRAFT_KEY);
              window.location.reload();
            }}
            className="w-full mt-3 text-white/25 text-[13px] hover:text-white/40 transition-colors py-2"
          >
            تخطي الآن
          </button>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [firstName, setFirstName]                   = useState("");
  const [lastName, setLastName]                     = useState("");
  const [birthday, setBirthday]                     = useState("");
  const [phone, setPhone]                           = useState("");
  const [selectedIllnesses, setSelectedIllnesses]   = useState<string[]>(["None"]);
  const [selectedInjuries, setSelectedInjuries]     = useState<string[]>(["None"]);
  const [level, setLevel]                           = useState<"normal" | "advanced">("normal");
  const [goal, setGoal]                             = useState<"maintain" | "lose" | "gain">("maintain");
  const [outcome, setOutcome]                       = useState<"muscle" | "health">("muscle");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from("members")
        .select("full_name, phone, date_of_birth, illnesses, injuries, training_level, weight_goal, fitness_outcome")
        .eq("auth_id", user.id)
        .single();
      if (!member) return;
      const parts = (member.full_name ?? "").split(" ");
      const fn = parts[0] ?? ""; const ln = parts.slice(1).join(" ") ?? "";
      const ph = member.phone ?? ""; const bd = member.date_of_birth ?? "";
      const il = member.illnesses?.length ? member.illnesses : ["None"];
      const inj = member.injuries?.length ? member.injuries : ["None"];
      const lv = (member.training_level as "normal" | "advanced") ?? "normal";
      const gl = (member.weight_goal as "maintain" | "lose" | "gain") ?? "maintain";
      const oc = (member.fitness_outcome as "muscle" | "health") ?? "muscle";

      setFirstName(fn); setLastName(ln); setPhone(ph); setBirthday(bd);
      setSelectedIllnesses(il); setSelectedInjuries(inj);
      setLevel(lv); setGoal(gl); setOutcome(oc);
      setProfileLoaded(true);

      // Show wizard if never completed and profile is bare
      const alreadyOnboarded = typeof window !== "undefined"
        && localStorage.getItem("profile_onboarded") === "1";
      const isBarProfile = !member.date_of_birth && !member.illnesses?.length && !member.injuries?.length;
      if (!alreadyOnboarded && isBarProfile) {
        setShowWizard(true);
      }
    }
    loadProfile();
  }, []);

  async function persistProfile() {
    const supabase = createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("members").update({
      full_name: `${firstName} ${lastName}`.trim(),
      phone: phone || null,
      date_of_birth: birthday || null,
      illnesses: selectedIllnesses,
      injuries: selectedInjuries,
      training_level: level,
      weight_goal: goal,
      fitness_outcome: outcome,
    }).eq("auth_id", user.id);
  }

  async function handleWizardComplete() {
    await persistProfile();
    localStorage.setItem("profile_onboarded", "1");
    localStorage.removeItem(WIZARD_DRAFT_KEY);
    setShowWizard(false);
  }

  function startEditing() {
    setSnapshot({ firstName, lastName, birthday, phone, illnesses: selectedIllnesses, injuries: selectedInjuries, level, goal, outcome });
    setSaveError(null); setIsEditing(true);
  }

  function cancelEditing() {
    if (!snapshot) return;
    setFirstName(snapshot.firstName); setLastName(snapshot.lastName);
    setBirthday(snapshot.birthday); setPhone(snapshot.phone);
    setSelectedIllnesses(snapshot.illnesses); setSelectedInjuries(snapshot.injuries);
    setLevel(snapshot.level); setGoal(snapshot.goal); setOutcome(snapshot.outcome);
    setSaveError(null); setIsEditing(false);
  }

  async function saveProfile() {
    setSaving(true); setSaveError(null);
    try {
      await persistProfile();
      setIsEditing(false);
    } catch {
      setSaveError("حدث خطأ أثناء الحفظ. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    if (!isEditing) return;
    if (item === "None") { setter(["None"]); return; }
    const without = list.filter((i) => i !== "None");
    if (without.includes(item)) {
      const next = without.filter((i) => i !== item);
      setter(next.length === 0 ? ["None"] : next);
    } else { setter([...without, item]); }
  }

  // Show wizard overlay
  if (showWizard && profileLoaded) {
    return (
      <ProfileWizard
        firstName={firstName}
        selectedIllnesses={selectedIllnesses} setSelectedIllnesses={setSelectedIllnesses}
        selectedInjuries={selectedInjuries}   setSelectedInjuries={setSelectedInjuries}
        level={level} setLevel={setLevel}
        goal={goal}   setGoal={setGoal}
        outcome={outcome} setOutcome={setOutcome}
        onComplete={handleWizardComplete}
      />
    );
  }

  return (
    <div className="relative min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="absolute top-6 left-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-right z-0">
        <Image src="/fig-bicep.png" alt="" fill className="object-contain object-left-top" unoptimized />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" label="رجوع" />

        {/* ── Header ── */}
        <div className="relative flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gold/10 border-2 border-gold/30 flex items-center justify-center mb-4"
            style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
            <span className="text-gold text-[24px] font-bold tracking-wider">{firstName[0]}{lastName[0]}</span>
          </div>
          <h1 className="text-white font-display text-[32px] tracking-wider leading-none">{t("profile.title")}</h1>
          <div className="w-16 h-[4px] danger-tape-thin mt-3" />

          {!isEditing ? (
            <button onClick={startEditing}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.10] hover:border-gold/40 hover:text-gold text-white/50 text-[14px] font-semibold transition-all duration-200">
              تعديل الملف
            </button>
          ) : (
            <button onClick={cancelEditing}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.10] hover:border-danger/40 hover:text-danger text-white/50 text-[14px] font-semibold transition-all duration-200">
              إلغاء
            </button>
          )}
        </div>

        {/* ── Personal Info ── */}
        <Section title={t("profile.personalInfo")} icon={<OxShield size={14} className="text-gold" />}>
          <InputField label={t("profile.firstName")} value={firstName} onChange={setFirstName} readOnly={!isEditing} />
          <InputField label={t("profile.lastName")} value={lastName} onChange={setLastName} readOnly={!isEditing} />
          <InputField label={t("profile.dateOfBirth")} value={birthday} onChange={setBirthday} type="date" readOnly={!isEditing} />
          <InputField label={t("profile.phone")} value={phone} onChange={setPhone} type="tel" readOnly={!isEditing} />
        </Section>

        {/* ── Health Conditions ── */}
        <Section title={t("profile.illnesses")} icon={<OxHeart size={14} className="text-danger" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.selectConditions")}</p>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {COMMON_CONDITIONS.map((item) => {
              const active = selectedIllnesses.includes(item);
              return (
                <button key={item} onClick={() => toggleItem(selectedIllnesses, item, setSelectedIllnesses)} disabled={!isEditing}
                  className={cn("px-4 py-2 text-[13px] font-medium border transition-all duration-200",
                    active ? "bg-gold/15 border-gold/40 text-gold" : "bg-white/[0.03] border-white/[0.08] text-white/50",
                    isEditing && !active && "hover:border-white/20 hover:text-white/70",
                    !isEditing && "cursor-default"
                  )}>
                  {active && <span className="ml-1.5">&#x2713;</span>}
                  {CONDITIONS_AR[item] ?? item}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Injuries ── */}
        <Section title={t("profile.injuries")} icon={<OxShield size={14} className="text-[#FF6B35]" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.selectInjuries")}</p>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {COMMON_INJURIES.map((item) => {
              const active = selectedInjuries.includes(item);
              return (
                <button key={item} onClick={() => toggleItem(selectedInjuries, item, setSelectedInjuries)} disabled={!isEditing}
                  className={cn("px-4 py-2 text-[13px] font-medium border transition-all duration-200",
                    active ? "bg-danger/10 border-danger/30 text-danger" : "bg-white/[0.03] border-white/[0.08] text-white/50",
                    isEditing && !active && "hover:border-white/20 hover:text-white/70",
                    !isEditing && "cursor-default"
                  )}>
                  {active && <span className="ml-1.5">&#x2713;</span>}
                  {INJURIES_AR[item] ?? item}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Training Level ── */}
        <Section title={t("profile.trainingLevel")} icon={<OxDumbbell size={14} className="text-gold" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.howExperienced")}</p>
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <LevelButton active={level === "normal"} onClick={() => isEditing && setLevel("normal")} title={t("profile.normal")} subtitle={t("profile.normalSub")} color="gold" disabled={!isEditing} />
            <LevelButton active={level === "advanced"} onClick={() => isEditing && setLevel("advanced")} title={t("profile.advanced")} subtitle={t("profile.advancedSub")} color="danger" disabled={!isEditing} />
          </div>
        </Section>

        {/* ── Weight Goal ── */}
        <Section title={t("profile.whatsYourGoal")} icon={<OxTarget size={14} className="text-gold" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.goalQuestion")}</p>
          <div className="grid grid-cols-3 gap-3 px-5 py-4">
            <GoalButton active={goal === "lose"} onClick={() => isEditing && setGoal("lose")} title={t("profile.cut")} subtitle={t("profile.cutSub")} icon={<OxFlame size={22} />} disabled={!isEditing} />
            <GoalButton active={goal === "maintain"} onClick={() => isEditing && setGoal("maintain")} title={t("profile.maintain")} subtitle={t("profile.maintainSub")} icon={<OxTarget size={22} />} disabled={!isEditing} />
            <GoalButton active={goal === "gain"} onClick={() => isEditing && setGoal("gain")} title={t("profile.bulk")} subtitle={t("profile.bulkSub")} icon={<OxDumbbell size={22} />} disabled={!isEditing} />
          </div>
        </Section>

        {/* ── Primary Outcome ── */}
        <Section title={t("profile.whatDrivesYou")} icon={<OxFlame size={14} className="text-danger" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.drivesQuestion")}</p>
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <OutcomeButton active={outcome === "muscle"} onClick={() => isEditing && setOutcome("muscle")} title={t("profile.buildStrength")} subtitle={t("profile.buildStrengthSub")} icon={<OxDumbbell size={24} />} disabled={!isEditing} />
            <OutcomeButton active={outcome === "health"} onClick={() => isEditing && setOutcome("health")} title={t("profile.peakWellness")} subtitle={t("profile.peakWellnessSub")} icon={<OxHeart size={24} />} disabled={!isEditing} />
          </div>
        </Section>

        {/* ── Save Button ── */}
        {isEditing && (
          <div className="mt-4 mb-6">
            {saveError && <p className="text-danger text-[13px] text-center mb-3">{saveError}</p>}
            <button className="w-full bg-gold hover:bg-gold-high active:bg-gold-deep text-void font-bold text-[16px] py-4 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ minHeight: "56px" }} onClick={saveProfile} disabled={saving}>
              <OxCheck size={20} />
              {saving ? "جاري الحفظ..." : t("profile.saveProfile")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components (unchanged) ────────────────────────────────
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">{title}</p>
      </div>
      <div className="relative bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-25" />
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", readOnly = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04] last:border-b-0">
      <label className="text-white/35 text-[14px] flex-shrink-0 ml-4">{label}</label>
      {readOnly ? (
        <p className="text-white text-[15px] font-medium text-left w-full max-w-[60%] truncate" dir="ltr">
          {value || <span className="text-white/20">—</span>}
        </p>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="bg-transparent text-white text-[15px] font-medium text-left w-full max-w-[60%] focus:outline-none focus:text-gold placeholder:text-white/15 transition-colors" dir="ltr" />
      )}
    </div>
  );
}

function LevelButton({ active, onClick, title, subtitle, color, disabled }: { active: boolean; onClick: () => void; title: string; subtitle: string; color: "gold" | "danger"; disabled?: boolean }) {
  const isGold = color === "gold";
  return (
    <button onClick={onClick}
      className={cn("relative p-5 border-2 text-right transition-all duration-200 overflow-hidden group",
        active ? isGold ? "bg-gold/10 border-gold/50 shadow-gold-sm" : "bg-danger/10 border-danger/40 shadow-red-sm" : "bg-white/[0.02] border-white/[0.08]",
        !disabled && !active && "hover:border-white/20", disabled && "cursor-default"
      )}>
      <div className={cn("absolute top-0 left-0 w-8 h-8 transition-opacity duration-200", active ? "opacity-100" : "opacity-0")}>
        <div className={cn("absolute top-0 left-0 w-0 h-0 border-t-[32px] border-r-[32px] border-r-transparent", isGold ? "border-t-gold/30" : "border-t-danger/30")} />
        <OxCheck size={12} className={cn("absolute top-1 left-1", isGold ? "text-gold" : "text-danger")} />
      </div>
      <p className={cn("font-display text-[22px] tracking-wider leading-none mb-1.5", active ? isGold ? "text-gold" : "text-danger" : "text-white/60")}>{title}</p>
      <p className={cn("text-[12px]", active ? "text-white/50" : "text-white/25")}>{subtitle}</p>
    </button>
  );
}

function GoalButton({ active, onClick, title, subtitle, icon, disabled }: { active: boolean; onClick: () => void; title: string; subtitle: string; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn("flex flex-col items-center p-4 border-2 text-center transition-all duration-200",
        active ? "bg-gold/10 border-gold/50 shadow-gold-sm" : "bg-white/[0.02] border-white/[0.08]",
        !disabled && !active && "hover:border-white/20", disabled && "cursor-default"
      )}>
      <div className={cn("mb-3 transition-colors duration-200", active ? "text-gold" : "text-white/25")}>{icon}</div>
      <p className={cn("font-display text-[16px] tracking-wider leading-none mb-1", active ? "text-gold" : "text-white/50")}>{title}</p>
      <p className={cn("text-[11px]", active ? "text-white/40" : "text-white/20")}>{subtitle}</p>
    </button>
  );
}

function OutcomeButton({ active, onClick, title, subtitle, icon, disabled }: { active: boolean; onClick: () => void; title: string; subtitle: string; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn("relative flex flex-col items-center p-6 border-2 text-center transition-all duration-200 overflow-hidden",
        active ? "bg-gold/10 border-gold/50" : "bg-white/[0.02] border-white/[0.08]",
        !disabled && !active && "hover:border-white/20", disabled && "cursor-default"
      )}>
      {active && <div className="absolute top-0 left-0 right-0 h-1 bg-hazard-stripe" />}
      <div className={cn("w-14 h-14 flex items-center justify-center mb-4 border transition-all duration-200",
        active ? "bg-gold/15 border-gold/30 text-gold" : "bg-white/[0.04] border-white/[0.06] text-white/20"
      )}>{icon}</div>
      <p className={cn("font-display text-[18px] tracking-wider leading-none mb-1.5", active ? "text-gold" : "text-white/50")}>{title}</p>
      <p className={cn("text-[12px] leading-tight", active ? "text-white/40" : "text-white/20")}>{subtitle}</p>
    </button>
  );
}
