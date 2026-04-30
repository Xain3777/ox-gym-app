"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { MACHINES, MUSCLE_GROUPS, type Machine, type MuscleGroup } from "@/data/machines";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxSearch, OxClose, OxPlay } from "@/components/icons/OxIcons";

const groupColor: Record<MuscleGroup, string> = {
  Cardio: "bg-success/[0.12] text-success",
  Chest: "bg-danger/[0.08] text-danger",
  Back: "bg-sky-400/10 text-sky-400",
  Legs: "bg-gold/10 text-gold",
  Shoulders: "bg-purple-400/10 text-purple-400",
  Arms: "bg-pink-400/10 text-pink-400",
  Core: "bg-orange-400/10 text-orange-400",
  Equipment: "bg-white/[0.06] text-white/50",
};

const groupLabelAr: Record<MuscleGroup, string> = {
  Cardio: "كارديو", Chest: "صدر", Back: "ظهر", Legs: "أرجل",
  Shoulders: "أكتاف", Arms: "ذراعين", Core: "بطن", Equipment: "معدات",
};

export default function MachinesPage() {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const [filter, setFilter] = useState<"All" | MuscleGroup>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Machine | null>(null);

  // Machine names + model strings turned out to be inaccurate — we only
  // surface the muscle group in the UI. Search matches on muscle-group
  // labels (English + Arabic) so the filter pills aren't the only entry
  // point. Text-of-name search is intentionally gone.
  const filtered = MACHINES.filter((m) => {
    const matchGroup = filter === "All" || m.muscleGroup === filter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || m.muscleGroup.toLowerCase().includes(q)
      || groupLabelAr[m.muscleGroup].includes(q);
    return matchGroup && matchSearch;
  });

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-2xl mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-6">{isAr ? "الأجهزة" : "MACHINES"}</h1>

        {/* Search */}
        <div className="relative mb-4">
          <OxSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/25 pointer-events-none" />
          <input type="text" dir={isAr ? "rtl" : "ltr"} placeholder={isAr ? "ابحث عن جهاز..." : "Search machines..."} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg py-3.5 pl-12 pr-4 text-[15px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
              <OxClose size={16} className="text-white/30" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-5 scrollbar-hide -mx-1 px-1">
          <button onClick={() => setFilter("All")} className={cn("shrink-0 px-4 py-2 rounded-md text-[13px] font-medium transition-all", filter === "All" ? "bg-gold text-void" : "bg-white/[0.05] text-white/40")}>
            {isAr ? "الكل" : "All"}
          </button>
          {MUSCLE_GROUPS.map((group) => (
            <button key={group} onClick={() => setFilter(group)} className={cn("shrink-0 px-4 py-2 rounded-md text-[13px] font-medium transition-all", filter === group ? "bg-gold text-void" : "bg-white/[0.05] text-white/40")}>
              {isAr ? groupLabelAr[group] : group}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <OxSearch className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-white/30 text-[15px]">{isAr ? "لم يتم العثور على أجهزة." : "No machines found."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((machine) => (
              <button key={machine.id} onClick={() => setSelected(machine)} className="rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-hidden text-left hover:bg-white/[0.05] hover:border-gold/10 active:scale-[0.98] transition-all duration-200">
                <div className="bg-white h-44 overflow-hidden">
                  <Image src={machine.image} alt="" width={400} height={250} className="w-full h-full object-contain p-4" />
                </div>
                <div className="p-4">
                  <span className={cn("inline-block text-[11px] font-medium px-2.5 py-1 rounded-sm", groupColor[machine.muscleGroup])}>
                    {isAr ? groupLabelAr[machine.muscleGroup] : machine.muscleGroup}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && <MachineModal machine={selected} isAr={isAr} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MachineModal({ machine, isAr, onClose }: { machine: Machine; isAr: boolean; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-iron w-full max-w-md sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto border border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2 sm:hidden" />
        <div className="bg-white sm:rounded-t-lg overflow-hidden">
          <Image src={machine.image} alt="" width={480} height={300} className="w-full h-52 object-contain p-6" priority />
        </div>
        <div className="p-6 space-y-4" dir={isAr ? "rtl" : "ltr"}>
          <div>
            <h2 className="text-white text-[22px] font-bold">
              {isAr ? groupLabelAr[machine.muscleGroup] : machine.muscleGroup}
            </h2>
            <span className={cn("inline-block mt-2 text-[11px] font-medium px-2.5 py-1 rounded-sm", groupColor[machine.muscleGroup])}>
              {isAr ? groupLabelAr[machine.muscleGroup] : machine.muscleGroup}
            </span>
          </div>
          <p className="text-white/40 text-[15px] leading-relaxed">{isAr ? machine.descriptionAr : machine.description}</p>
          {machine.demo && !playing ? (
            <button onClick={() => setPlaying(true)} className="w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 rounded-lg transition-colors flex items-center justify-center gap-2" style={{ minHeight: "56px" }}>
              <OxPlay size={20} />{isAr ? "شغّل العرض" : "PLAY DEMO"}
            </button>
          ) : machine.demo && playing ? (
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
              <iframe src={`https://www.youtube.com/embed/${machine.demo}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen className="w-full h-full" />
            </div>
          ) : null}
          <button onClick={onClose} className="w-full bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[16px] py-4 rounded-lg transition-colors" style={{ minHeight: "56px" }}>
            {isAr ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
