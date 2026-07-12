"use client";

// ═══════════════════════════════════════════════════════════════
// MediaPickerModal — the ONE way a coach attaches a picture to an
// exercise. No auto-matching: the full list of gym pictures
// (machine photos from /public/gym-machines + exercise demo art
// from /public/exercises/machines) is shown with previews and the
// coach explicitly taps the right one, so the wrong machine can
// never be attached by a name guess.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import { Search, X, ImageOff } from "lucide-react";
import { ExerciseImage } from "@/components/ui/ExerciseImage";
import { cn } from "@/lib/utils";

export type MediaSource = {
  name: string;
  url: string;
  type: "machine" | "demo";
};

// Module-level cache — the list is static per deploy, so every picker
// on the page shares one fetch.
let cachedSources: MediaSource[] | null = null;
let inflight: Promise<MediaSource[]> | null = null;

async function fetchMediaSources(): Promise<MediaSource[]> {
  if (cachedSources) return cachedSources;
  if (!inflight) {
    inflight = fetch("/api/coach/media-sources")
      .then((res) => res.json())
      .then((json) => {
        cachedSources = json?.success ? (json.data as MediaSource[]) ?? [] : [];
        return cachedSources;
      })
      .catch(() => {
        inflight = null;
        return [] as MediaSource[];
      });
  }
  return inflight;
}

export function useMediaSources(): MediaSource[] {
  const [sources, setSources] = useState<MediaSource[]>(cachedSources ?? []);

  useEffect(() => {
    let active = true;
    fetchMediaSources().then((list) => {
      if (active) setSources(list);
    });
    return () => { active = false; };
  }, []);

  return sources;
}

export function MediaPickerModal({
  open,
  title,
  filter = "all",
  currentUrl,
  onSelect,
  onClose,
}: {
  open:        boolean;
  title:       string;
  /** "machine" = machine photos only, "demo" = exercise art only, "all" = both with tabs */
  filter?:     "machine" | "demo" | "all";
  currentUrl?: string | null;
  /** null = coach chose "no picture" */
  onSelect:    (source: MediaSource | null) => void;
  onClose:     () => void;
}) {
  const sources = useMediaSources();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"machine" | "demo">(filter === "demo" ? "demo" : "machine");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTab(filter === "demo" ? "demo" : "machine");
  }, [open, filter]);

  const activeType = filter === "all" ? tab : filter;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources
      .filter((s) => s.type === activeType)
      .filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [sources, activeType, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-charcoal border border-steel shadow-dark-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-steel flex-shrink-0">
          <p className="text-white text-[14px] font-bold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search + tabs */}
        <div className="px-4 py-3 border-b border-steel space-y-2 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم… / Search…"
              className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 bg-iron border border-steel text-white text-[13px] placeholder:text-white/25 focus:border-gold/50 focus:outline-none transition-colors"
            />
          </div>
          {filter === "all" && (
            <div className="flex gap-2">
              {([
                { key: "machine", label: "صور الأجهزة" },
                { key: "demo",    label: "صور التمارين" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border transition-colors",
                    tab === t.key
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-steel bg-charcoal text-muted hover:border-slate",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {/* "No picture" tile */}
            <button
              type="button"
              onClick={() => { onSelect(null); onClose(); }}
              className={cn(
                "border transition-colors overflow-hidden text-center",
                !currentUrl ? "border-gold/40 bg-gold/[0.06]" : "border-steel/60 bg-white/[0.02] hover:border-gold/30",
              )}
            >
              <div className="w-full h-24 flex items-center justify-center text-white/25 bg-iron">
                <ImageOff size={22} />
              </div>
              <p className="p-2 text-white/60 text-[11px]">بدون صورة</p>
            </button>

            {filtered.map((source) => {
              const selected = currentUrl === source.url;
              return (
                <button
                  key={source.url}
                  type="button"
                  onClick={() => { onSelect(source); onClose(); }}
                  className={cn(
                    "border transition-colors overflow-hidden text-center",
                    selected ? "border-gold/60 bg-gold/[0.08]" : "border-steel/60 bg-white/[0.02] hover:border-gold/30",
                  )}
                >
                  <ExerciseImage src={source.url} alt={source.name} className="w-full h-24" iconSize={18} />
                  <p className={cn("p-2 text-[11px] truncate", selected ? "text-gold" : "text-white/70")}>{source.name}</p>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-white/35 text-[12px] text-center py-10">
              {sources.length === 0 ? "جار تحميل الصور…" : "لا توجد صور مطابقة."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Small labelled preview slot used next to each exercise: shows the
// currently picked picture (or an empty placeholder) + a button that
// opens the picker.
export function MediaSlot({
  label,
  url,
  onPick,
  onClear,
}: {
  label:   string;
  url:     string | null | undefined;
  onPick:  () => void;
  onClear: () => void;
}) {
  return (
    <div className="border border-steel/60 bg-charcoal p-2 space-y-1.5">
      <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-muted">{label}</p>
      <button
        type="button"
        onClick={onPick}
        title={url ? "تغيير الصورة" : "اختيار صورة"}
        className="block w-full border border-steel/40 hover:border-gold/40 transition-colors overflow-hidden"
      >
        {url ? (
          <ExerciseImage src={url} alt={label} className="w-full h-20" iconSize={16} />
        ) : (
          <div className="w-full h-20 flex flex-col items-center justify-center gap-1 text-white/30 bg-iron text-[10px]">
            <ImageOff size={16} />
            اختر من القائمة
          </div>
        )}
      </button>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onPick}
          className="flex-1 h-6 border border-steel text-muted hover:border-gold/40 hover:text-gold font-mono text-[9px] uppercase tracking-wider transition-colors"
        >
          {url ? "تغيير" : "اختيار"}
        </button>
        {url && (
          <button
            type="button"
            onClick={onClear}
            title="إزالة الصورة"
            className="h-6 px-2 border border-steel text-muted hover:border-danger/50 hover:text-danger transition-colors"
          >
            <X size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
