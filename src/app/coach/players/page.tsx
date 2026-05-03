"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Search, User, ChevronDown } from "lucide-react";
import type { MemberWithSub } from "@/types";

// Coach view extends the base Member shape with the body / goals /
// medical fields the coach needs to design plans. RLS already lets
// staff read these columns; we just project them into the query.
type CoachPlayer = MemberWithSub & {
  height_cm:      number | null;
  weight_kg:      number | null;
  illnesses:      string[] | null;
  injuries:       string[] | null;
  fitness_goal:   string | null;
  training_level: string | null;
};

export default function CoachPlayersPage() {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<CoachPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expiring" | "expired">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data } = await supabase
          .from("members")
          .select("*, subscription:subscriptions(*)")
          .eq("role", "player")
          .order("created_at", { ascending: false });

        if (data) {
          setPlayers(data.map((m: Record<string, unknown>) => ({
            ...m,
            subscription: Array.isArray(m.subscription) ? m.subscription[0] ?? null : m.subscription,
          })) as CoachPlayer[]);
        }
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = players.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.full_name.toLowerCase().includes(q)
        || (p.username?.toLowerCase().includes(q) ?? false)
        || (p.phone?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filters = ["all", "active", "expiring", "expired"] as const;

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5">
      <h1 className="font-display text-[28px] tracking-wider text-white">{t("coach.myPlayers")}</h1>
      <p className="text-white/40 text-[13px]">{t("coach.myPlayersDesc")}</p>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("members.searchPlaceholder")}
          className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 bg-white/[0.04] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:border-[#FF6B35]/50 focus:outline-none transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 text-[12px] font-medium uppercase tracking-wider transition-colors",
              filter === f ? "bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30" : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60",
            )}
          >
            {t(`members.${f}`)}
          </button>
        ))}
      </div>

      {/* Player List */}
      {loading ? (
        <div className="text-white/40 text-center py-12">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <User size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-[14px]">{search || filter !== "all" ? t("members.noMembersFiltered") : t("coach.noPlayersDesc")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((player) => {
            const isOpen = expanded.has(player.id);
            const hasDetails =
              player.height_cm != null
              || player.weight_kg != null
              || (player.illnesses?.length && !(player.illnesses.length === 1 && player.illnesses[0] === "None"))
              || (player.injuries?.length && !(player.injuries.length === 1 && player.injuries[0] === "None"))
              || !!player.fitness_goal
              || !!player.training_level;

            return (
              <div key={player.id} className="bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                <button
                  type="button"
                  onClick={() => hasDetails && toggleExpanded(player.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 text-right transition-colors",
                    hasDetails ? "hover:bg-white/[0.06] cursor-pointer" : "cursor-default",
                  )}
                >
                  <div className="w-10 h-10 bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35] font-bold text-[14px]">
                    {player.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[14px] font-medium truncate">{player.full_name}</p>
                    <p className="text-white/40 text-[12px] truncate">{player.phone ?? player.username ?? ""}</p>
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold uppercase px-2 py-1",
                    player.status === "active" ? "bg-green-500/10 text-green-400" :
                    player.status === "expiring" ? "bg-gold/10 text-gold" :
                    "bg-danger/10 text-danger",
                  )}>
                    {t(`members.${player.status}`)}
                  </span>
                  {hasDetails && (
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-white/30 flex-shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  )}
                </button>

                {isOpen && hasDetails && (
                  <div className="border-t border-white/[0.06] p-4 grid grid-cols-2 gap-3 text-[12.5px]" dir="rtl">
                    {player.height_cm != null && (
                      <DetailRow label="الطول">{player.height_cm} سم</DetailRow>
                    )}
                    {player.weight_kg != null && (
                      <DetailRow label="الوزن">{player.weight_kg} كغ</DetailRow>
                    )}
                    {player.training_level && (
                      <DetailRow label="المستوى">{player.training_level}</DetailRow>
                    )}
                    {player.fitness_goal && (
                      <DetailRow label="الهدف">{player.fitness_goal}</DetailRow>
                    )}
                    <DetailRow label="الأمراض" full>
                      {filterMeaningful(player.illnesses)}
                    </DetailRow>
                    <DetailRow label="الإصابات" full>
                      {filterMeaningful(player.injuries)}
                    </DetailRow>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", full && "col-span-2")}>
      <span className="text-white/35 text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <span className="text-white/85">{children}</span>
    </div>
  );
}

function filterMeaningful(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "—";
  const cleaned = values.filter((v) => v && v !== "None");
  return cleaned.length > 0 ? cleaned.join(" · ") : "—";
}
