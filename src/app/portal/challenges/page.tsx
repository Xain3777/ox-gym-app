"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { OxTrophy, OxFlame, OxCheck, OxStar, OxTarget, OxAward } from "@/components/icons/OxIcons";

// ── MOCK LEADERBOARD DATA ──────────────────────────────────────
const mockLeaderboard = [
  { rank: 1, name: "Rami K.", points: 2840, streak: 14, avatar: "RK" },
  { rank: 2, name: "Sara M.", points: 2650, streak: 11, avatar: "SM" },
  { rank: 3, name: "Ali H.", points: 2510, streak: 9, avatar: "AH" },
  { rank: 4, name: "Zein H.", points: 2380, streak: 7, avatar: "ZH" },
  { rank: 5, name: "Maya B.", points: 2200, streak: 6, avatar: "MB" },
  { rank: 6, name: "Karim D.", points: 2050, streak: 5, avatar: "KD" },
  { rank: 7, name: "Nour A.", points: 1920, streak: 4, avatar: "NA" },
  { rank: 8, name: "Tarek S.", points: 1800, streak: 3, avatar: "TS" },
  { rank: 9, name: "Lina F.", points: 1690, streak: 3, avatar: "LF" },
  { rank: 10, name: "Omar J.", points: 1550, streak: 2, avatar: "OJ" },
  { rank: 11, name: "Hadi R.", points: 1420, streak: 2, avatar: "HR" },
  { rank: 12, name: "Dina W.", points: 1300, streak: 1, avatar: "DW" },
  { rank: 13, name: "Fadi N.", points: 1180, streak: 1, avatar: "FN" },
  { rank: 14, name: "Rana T.", points: 1050, streak: 0, avatar: "RT" },
  { rank: 15, name: "Jad L.", points: 940, streak: 0, avatar: "JL" },
];

// ── MOCK CHALLENGES ────────────────────────────────────────────
const mockDailyChallenges = [
  { id: 1, titleKey: "challenges.heavyHitter", descKey: "challenges.heavyHitterDesc", xp: 120, done: true, icon: "strength" },
  { id: 2, titleKey: "challenges.cardioBeast", descKey: "challenges.cardioBeastDesc", xp: 100, done: false, icon: "cardio" },
  { id: 3, titleKey: "challenges.ironCore", descKey: "challenges.ironCoreDesc", xp: 80, done: false, icon: "core" },
];

const mockStreak = {
  current: 7,
  best: 14,
  weekDays: [true, true, true, true, true, true, true],
};

const currentUserRank = 4;

type Tab = "leaderboard" | "challenges";

export default function ChallengesPage() {
  const [tab, setTab] = useState<Tab>("leaderboard");
  const { t } = useTranslation();

  return (
    <div className="relative min-h-full pb-28 lg:pb-10">
      <div className="absolute top-6 left-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-right z-0">
        <Image src="/fig-flex.png" alt="" fill className="object-contain object-left-top" unoptimized />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <div className="relative mb-6">
          <h1 className="text-white font-display text-[32px] tracking-wider leading-none">
            {t("challenges.title")}
          </h1>
          <div className="w-24 h-[4px] mt-3 danger-tape-thin" />
        </div>

        <div className="flex gap-2 mb-6">
          <TabButton active={tab === "leaderboard"} onClick={() => setTab("leaderboard")} icon={<OxTrophy size={16} />} label={t("challenges.leaderboard")} />
          <TabButton active={tab === "challenges"} onClick={() => setTab("challenges")} icon={<OxTarget size={16} />} label={t("challenges.dailyChallenges")} />
        </div>

        {tab === "leaderboard" ? <LeaderboardTab /> : <ChallengesTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-bold uppercase tracking-wider border-2 transition-all duration-200",
        active ? "bg-gold/10 border-gold/50 text-gold" : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function LeaderboardTab() {
  const { t } = useTranslation();
  const top3 = mockLeaderboard.slice(0, 3);
  const rest = mockLeaderboard.slice(3);

  const medalColors = {
    1: { bg: "bg-[#FFD700]/10", border: "border-[#FFD700]/40", text: "text-[#FFD700]", labelKey: "challenges.gold", shadow: "shadow-[0_0_20px_rgba(255,215,0,0.15)]" },
    2: { bg: "bg-[#C0C0C0]/10", border: "border-[#C0C0C0]/30", text: "text-[#C0C0C0]", labelKey: "challenges.silver", shadow: "shadow-[0_0_15px_rgba(192,192,192,0.1)]" },
    3: { bg: "bg-[#CD7F32]/10", border: "border-[#CD7F32]/30", text: "text-[#CD7F32]", labelKey: "challenges.bronze", shadow: "shadow-[0_0_15px_rgba(205,127,50,0.1)]" },
  } as Record<number, { bg: string; border: string; text: string; labelKey: string; shadow: string }>;

  return (
    <div className="space-y-3">
      {top3.map((user) => {
        const medal = medalColors[user.rank];
        return (
          <div key={user.rank} className={cn("relative w-full border-2 p-5 overflow-hidden", medal.bg, medal.border, medal.shadow)}>
            <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-30" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("w-14 h-14 flex items-center justify-center font-display text-[28px] tracking-wider", medal.bg, medal.border, "border-2")}>
                  <span className={medal.text}>{user.rank}</span>
                </div>
                <div>
                  <p className={cn("text-[18px] font-bold", medal.text)}>{user.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/40 text-[13px]">{user.points.toLocaleString()} XP</span>
                    {user.streak > 0 && (
                      <span className="flex items-center gap-1 text-[12px] text-[#FF6B35]">
                        <OxFlame size={12} />{user.streak}{t("challenges.daysShort")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className={cn("w-10 h-10 flex items-center justify-center", medal.text)}>
                {user.rank === 1 ? <OxTrophy size={28} /> : <OxAward size={24} />}
              </div>
            </div>
            <div className={cn("absolute bottom-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest", medal.bg, medal.text)}>
              {t(medal.labelKey)}
            </div>
          </div>
        );
      })}

      <div className="relative bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-20" />
        <div className="max-h-[400px] overflow-y-auto">
          {rest.map((user) => {
            const isMe = user.rank === currentUserRank;
            return (
              <div key={user.rank} className={cn("flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 transition-colors", isMe && "bg-gold/[0.06]")}>
                <div className="flex items-center gap-4">
                  <span className={cn("w-8 text-[16px] font-bold text-center", isMe ? "text-gold" : "text-white/30")}>{user.rank}</span>
                  <div className={cn("w-9 h-9 flex items-center justify-center text-[12px] font-bold", isMe ? "bg-gold/15 text-gold border border-gold/30" : "bg-white/[0.06] text-white/40")}>{user.avatar}</div>
                  <div>
                    <p className={cn("text-[15px] font-medium", isMe ? "text-gold" : "text-white/80")}>
                      {user.name} {isMe && <span className="text-gold/60 text-[12px]">({t("challenges.you")})</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {user.streak > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-[#FF6B35]">
                      <OxFlame size={10} />{user.streak}
                    </span>
                  )}
                  <span className="text-white/40 text-[13px] font-medium w-16 text-right">{user.points.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChallengesTab() {
  const { t } = useTranslation();
  const completedCount = mockDailyChallenges.filter((c) => c.done).length;
  const allDone = completedCount === mockDailyChallenges.length;
  const weekDayKeys = ["challenges.mon", "challenges.tue", "challenges.wed", "challenges.thu", "challenges.fri", "challenges.sat", "challenges.sun"];

  return (
    <div className="space-y-5">
      {/* Streak Bar */}
      <div className="relative bg-white/[0.03] border border-white/[0.06] p-5 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-25" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <OxFlame size={18} className="text-[#FF6B35]" />
            <p className="text-white text-[16px] font-bold">
              {mockStreak.current} {t("challenges.dayStreak")}
            </p>
          </div>
          <span className="text-white/30 text-[12px]">
            {t("challenges.best")}: {mockStreak.best}{t("challenges.daysShort")}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDayKeys.map((dayKey, i) => {
            const active = mockStreak.weekDays[i];
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "w-full aspect-square flex items-center justify-center transition-all",
                  active ? "bg-gradient-to-b from-[#FF6B35]/20 to-gold/10 border border-[#FF6B35]/30" : "bg-white/[0.03] border border-white/[0.06]"
                )}>
                  {active ? <OxFlame size={16} className="text-[#FF6B35]" /> : <div className="w-2 h-2 bg-white/10 rounded-full" />}
                </div>
                <span className={cn("text-[10px] font-medium", active ? "text-[#FF6B35]" : "text-white/20")}>{t(dayKey)}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 w-full h-1.5 bg-white/[0.06] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FF6B35] to-gold transition-all duration-500" style={{ width: `${(mockStreak.current / mockStreak.best) * 100}%` }} />
        </div>
      </div>

      {/* Daily Progress */}
      <div className="flex items-center justify-between px-1">
        <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">{t("challenges.dailyTitle")}</p>
        <span className="text-white/40 text-[13px] font-medium">{completedCount}/{mockDailyChallenges.length}</span>
      </div>

      {/* Challenge Cards */}
      {mockDailyChallenges.map((challenge) => {
        const iconMap: Record<string, React.ReactNode> = {
          strength: <OxTarget size={20} />,
          cardio: <OxFlame size={20} />,
          core: <OxStar size={20} />,
        };

        return (
          <div key={challenge.id} className={cn("relative border p-5 overflow-hidden transition-all duration-200", challenge.done ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06]")}>
            {challenge.done && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold" />}
            <div className="flex items-start gap-4">
              <div className={cn("w-12 h-12 flex items-center justify-center flex-shrink-0 transition-all", challenge.done ? "bg-gold text-void" : "bg-white/[0.06] border border-white/[0.08] text-white/25")}>
                {challenge.done ? <OxCheck size={20} /> : iconMap[challenge.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn("text-[16px] font-semibold", challenge.done ? "text-white/40 line-through" : "text-white")}>{t(challenge.titleKey)}</p>
                  <span className={cn("text-[13px] font-bold ml-2 flex-shrink-0", challenge.done ? "text-gold/40" : "text-gold")}>+{challenge.xp} XP</span>
                </div>
                <p className="text-white/35 text-[13px] mt-1 leading-relaxed">{t(challenge.descKey)}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Bonus Challenge */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2 px-1">
          <OxAward size={14} className="text-gold" />
          <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">{t("challenges.bonusReward")}</p>
        </div>

        <div className={cn("relative border-2 p-5 overflow-hidden transition-all duration-200", allDone ? "bg-gold/[0.08] border-gold/40 burn-glow" : "bg-white/[0.02] border-white/[0.06] opacity-60")}>
          <div className={cn("absolute top-0 left-0 right-0 h-[4px] danger-tape", !allDone && "opacity-20")} />
          {allDone && (
            <div className="flex justify-center -mt-1 mb-3">
              <MiniChevron className="text-gold/50" />
              <MiniChevron className="text-gold/30" />
              <MiniChevron className="text-gold/50" />
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 flex items-center justify-center flex-shrink-0 border-2", allDone ? "bg-gold/20 border-gold/40 text-gold" : "bg-white/[0.04] border-white/[0.06] text-white/15")}>
              <OxTrophy size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className={cn("font-display text-[20px] tracking-wider leading-none", allDone ? "text-gold" : "text-white/30")}>
                  {t("challenges.theOxGrind")}
                </p>
                <span className={cn("text-[14px] font-bold", allDone ? "text-gold" : "text-white/20")}>+250 XP</span>
              </div>
              <p className={cn("text-[13px] mt-1.5", allDone ? "text-white/50" : "text-white/20")}>
                {allDone ? t("challenges.exclusiveBadge") : t("challenges.completeAll")}
              </p>
              {!allDone && (
                <div className="mt-3 w-full h-1.5 bg-white/[0.06] overflow-hidden">
                  <div className="h-full bg-gold/40 transition-all duration-500" style={{ width: `${(completedCount / mockDailyChallenges.length) * 100}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChevron({ className }: { className?: string }) {
  return (
    <svg width="20" height="8" viewBox="0 0 20 8" fill="currentColor" className={className}>
      <path d="M0 0L10 6L20 0V2L10 8L0 2V0Z" />
    </svg>
  );
}
