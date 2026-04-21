"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxCheck, OxShield, OxHeart, OxTarget, OxDumbbell, OxFlame } from "@/components/icons/OxIcons";
import { createBrowserSupabase } from "@/lib/supabase";

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
  "Asthma": "الربو",
  "Diabetes (Type 1)": "السكري (النوع الأول)",
  "Diabetes (Type 2)": "السكري (النوع الثاني)",
  "High Blood Pressure": "ضغط الدم المرتفع",
  "Heart Condition": "أمراض القلب",
  "Epilepsy": "الصرع",
  "Thyroid Disorder": "اضطراب الغدة الدرقية",
  "Chronic Fatigue": "التعب المزمن",
  "None": "لا شيء",
};

const INJURIES_AR: Record<string, string> = {
  "Lower Back Pain": "ألم أسفل الظهر",
  "Knee Injury (ACL/MCL)": "إصابة الركبة (ACL/MCL)",
  "Shoulder Impingement": "ضغط الكتف",
  "Herniated Disc": "انزلاق غضروفي",
  "Rotator Cuff Tear": "تمزق كفة الروتاتور",
  "Ankle Sprain (Chronic)": "التواء الكاحل (مزمن)",
  "Tennis / Golfer's Elbow": "كوع التنس / الجولف",
  "Wrist / Carpal Tunnel": "إصابة المعصم / النفق الرسغي",
  "Hip Flexor Strain": "شد عضلة الورك",
  "None": "لا شيء",
};

type ProfileSnapshot = {
  firstName: string;
  lastName: string;
  birthday: string;
  phone: string;
  illnesses: string[];
  injuries: string[];
  level: "normal" | "advanced";
  goal: "maintain" | "lose" | "gain";
  outcome: "muscle" | "health";
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedIllnesses, setSelectedIllnesses] = useState<string[]>(["None"]);
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>(["None"]);
  const [level, setLevel] = useState<"normal" | "advanced">("normal");
  const [goal, setGoal] = useState<"maintain" | "lose" | "gain">("maintain");
  const [outcome, setOutcome] = useState<"muscle" | "health">("muscle");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from("members")
        .select("full_name, phone, date_of_birth, illnesses, injuries, fitness_level, weight_goal, fitness_outcome")
        .eq("auth_id", user.id)
        .single();
      if (!member) return;
      const parts = (member.full_name ?? "").split(" ");
      const fn = parts[0] ?? "";
      const ln = parts.slice(1).join(" ") ?? "";
      const ph = member.phone ?? "";
      const bd = member.date_of_birth ?? "";
      const il = member.illnesses?.length ? member.illnesses : ["None"];
      const inj = member.injuries?.length ? member.injuries : ["None"];
      const lv = (member.fitness_level as "normal" | "advanced") ?? "normal";
      const gl = (member.weight_goal as "maintain" | "lose" | "gain") ?? "maintain";
      const oc = (member.fitness_outcome as "muscle" | "health") ?? "muscle";

      setFirstName(fn); setLastName(ln); setPhone(ph); setBirthday(bd);
      setSelectedIllnesses(il); setSelectedInjuries(inj);
      setLevel(lv); setGoal(gl); setOutcome(oc);
    }
    loadProfile();
  }, []);

  function startEditing() {
    setSnapshot({ firstName, lastName, birthday, phone, illnesses: selectedIllnesses, injuries: selectedInjuries, level, goal, outcome });
    setIsEditing(true);
  }

  function cancelEditing() {
    if (!snapshot) return;
    setFirstName(snapshot.firstName); setLastName(snapshot.lastName);
    setBirthday(snapshot.birthday); setPhone(snapshot.phone);
    setSelectedIllnesses(snapshot.illnesses); setSelectedInjuries(snapshot.injuries);
    setLevel(snapshot.level); setGoal(snapshot.goal); setOutcome(snapshot.outcome);
    setIsEditing(false);
  }

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    if (!isEditing) return;
    if (item === "None") { setter(["None"]); return; }
    const without = list.filter((i) => i !== "None");
    if (without.includes(item)) {
      const next = without.filter((i) => i !== item);
      setter(next.length === 0 ? ["None"] : next);
    } else {
      setter([...without, item]);
    }
  }

  return (
    <div className="relative min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="absolute top-6 left-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-right z-0">
        <Image src="/fig-bicep.png" alt="" fill className="object-contain object-left-top" unoptimized />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" label="رجوع" />

        {/* ── Header ─────────────────────────────────── */}
        <div className="relative flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gold/10 border-2 border-gold/30 flex items-center justify-center mb-4" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
            <span className="text-gold text-[24px] font-bold tracking-wider">
              {firstName[0]}{lastName[0]}
            </span>
          </div>
          <h1 className="text-white font-display text-[32px] tracking-wider leading-none">
            {t("profile.title")}
          </h1>
          <div className="w-16 h-[4px] danger-tape-thin mt-3" />

          {/* Edit / Cancel button */}
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.10] hover:border-gold/40 hover:text-gold text-white/50 text-[14px] font-semibold transition-all duration-200"
            >
              تعديل الملف
            </button>
          ) : (
            <button
              onClick={cancelEditing}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.10] hover:border-danger/40 hover:text-danger text-white/50 text-[14px] font-semibold transition-all duration-200"
            >
              إلغاء
            </button>
          )}
        </div>

        {/* ── Personal Info ────────────────────────────── */}
        <Section title={t("profile.personalInfo")} icon={<OxShield size={14} className="text-gold" />}>
          <InputField label={t("profile.firstName")} value={firstName} onChange={setFirstName} readOnly={!isEditing} />
          <InputField label={t("profile.lastName")} value={lastName} onChange={setLastName} readOnly={!isEditing} />
          <InputField label={t("profile.dateOfBirth")} value={birthday} onChange={setBirthday} type="date" readOnly={!isEditing} />
          <InputField label={t("profile.phone")} value={phone} onChange={setPhone} type="tel" readOnly={!isEditing} />
        </Section>

        {/* ── Health Conditions ────────────────────────── */}
        <Section title={t("profile.illnesses")} icon={<OxHeart size={14} className="text-danger" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.selectConditions")}</p>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {COMMON_CONDITIONS.map((item) => {
              const active = selectedIllnesses.includes(item);
              return (
                <button key={item}
                  onClick={() => toggleItem(selectedIllnesses, item, setSelectedIllnesses)}
                  disabled={!isEditing}
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

        {/* ── Injuries ─────────────────────────────────── */}
        <Section title={t("profile.injuries")} icon={<OxShield size={14} className="text-[#FF6B35]" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.selectInjuries")}</p>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {COMMON_INJURIES.map((item) => {
              const active = selectedInjuries.includes(item);
              return (
                <button key={item}
                  onClick={() => toggleItem(selectedInjuries, item, setSelectedInjuries)}
                  disabled={!isEditing}
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

        {/* ── Training Level ───────────────────────────── */}
        <Section title={t("profile.trainingLevel")} icon={<OxDumbbell size={14} className="text-gold" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.howExperienced")}</p>
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <LevelButton active={level === "normal"} onClick={() => isEditing && setLevel("normal")} title={t("profile.normal")} subtitle={t("profile.normalSub")} color="gold" disabled={!isEditing} />
            <LevelButton active={level === "advanced"} onClick={() => isEditing && setLevel("advanced")} title={t("profile.advanced")} subtitle={t("profile.advancedSub")} color="danger" disabled={!isEditing} />
          </div>
        </Section>

        {/* ── Weight Goal ──────────────────────────────── */}
        <Section title={t("profile.whatsYourGoal")} icon={<OxTarget size={14} className="text-gold" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.goalQuestion")}</p>
          <div className="grid grid-cols-3 gap-3 px-5 py-4">
            <GoalButton active={goal === "lose"} onClick={() => isEditing && setGoal("lose")} title={t("profile.cut")} subtitle={t("profile.cutSub")} icon={<OxFlame size={22} />} disabled={!isEditing} />
            <GoalButton active={goal === "maintain"} onClick={() => isEditing && setGoal("maintain")} title={t("profile.maintain")} subtitle={t("profile.maintainSub")} icon={<OxTarget size={22} />} disabled={!isEditing} />
            <GoalButton active={goal === "gain"} onClick={() => isEditing && setGoal("gain")} title={t("profile.bulk")} subtitle={t("profile.bulkSub")} icon={<OxDumbbell size={22} />} disabled={!isEditing} />
          </div>
        </Section>

        {/* ── Primary Outcome ──────────────────────────── */}
        <Section title={t("profile.whatDrivesYou")} icon={<OxFlame size={14} className="text-danger" />}>
          <p className="text-white/30 text-[13px] px-5 pt-3 pb-1">{t("profile.drivesQuestion")}</p>
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <OutcomeButton active={outcome === "muscle"} onClick={() => isEditing && setOutcome("muscle")} title={t("profile.buildStrength")} subtitle={t("profile.buildStrengthSub")} icon={<OxDumbbell size={24} />} disabled={!isEditing} />
            <OutcomeButton active={outcome === "health"} onClick={() => isEditing && setOutcome("health")} title={t("profile.peakWellness")} subtitle={t("profile.peakWellnessSub")} icon={<OxHeart size={24} />} disabled={!isEditing} />
          </div>
        </Section>

        {/* ── Save Button (only shown when editing) ──── */}
        {isEditing && (
          <button
            className="w-full mt-4 mb-6 bg-gold hover:bg-gold-high active:bg-gold-deep text-void font-bold text-[16px] py-4 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ minHeight: "56px" }}
            onClick={() => setIsEditing(false)}
          >
            <OxCheck size={20} />
            {t("profile.saveProfile")}
          </button>
        )}
      </div>
    </div>
  );
}

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

function InputField({
  label, value, onChange, placeholder, type = "text", readOnly = false
}: {
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
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="bg-transparent text-white text-[15px] font-medium text-left w-full max-w-[60%] focus:outline-none focus:text-gold placeholder:text-white/15 transition-colors"
          dir="ltr"
        />
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
        !disabled && !active && "hover:border-white/20",
        disabled && "cursor-default"
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
        !disabled && !active && "hover:border-white/20",
        disabled && "cursor-default"
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
        !disabled && !active && "hover:border-white/20",
        disabled && "cursor-default"
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
