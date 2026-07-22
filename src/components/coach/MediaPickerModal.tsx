"use client";

// ═══════════════════════════════════════════════════════════════
// MediaPickerModal — the ONE way a coach attaches a picture to an
// exercise. No auto-matching, no typing a path: every picture we
// have (machine photos from /public/gym-machines + exercise art from
// /public/exercises/machines) is shown at once as a big tap-to-pick
// grid — the same interaction as choosing a photo to post as a
// story: scroll, look, tap, done.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import { Search, X, ImageOff, Check } from "lucide-react";
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

const GROUP_LABEL: Record<MediaSource["type"], string> = {
  machine: "صور الأجهزة",
  demo:    "صور التمارين",
};

export function MediaPickerModal({
  open,
  title,
  currentUrl,
  onSelect,
  onClose,
}: {
  open:        boolean;
  title:       string;
  currentUrl?: string | null;
  /** null = coach chose "no picture" */
  onSelect:    (source: MediaSource | null) => void;
  onClose:     () => void;
}) {
  const sources = useMediaSources();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Everything is visible at once — no type tabs to click through.
  // Grouped into two labelled sections within ONE continuous scroll,
  // like a photo app grouping a camera roll without hiding anything.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? sources.filter((s) => s.name.toLowerCase().includes(q)) : sources;
    return (["machine", "demo"] as const)
      .map((type) => ({ type, items: matches.filter((s) => s.type === type) }))
      .filter((g) => g.items.length > 0);
  }, [sources, query]);

  const totalShown = groups.reduce((n, g) => n + g.items.length, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/80" onClick={onClose}>
      <div
        className="w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col bg-charcoal border border-steel shadow-dark-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-steel flex-shrink-0">
          <div>
            <p className="text-white text-[15px] font-bold">{title}</p>
            <p className="text-white/35 text-[11px] mt-0.5">{sources.length} صورة متاحة — اضغط لاختيار واحدة</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search — optional, no autofocus so the grid is what you see first */}
        <div className="px-4 py-2.5 border-b border-steel flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم… (اختياري)"
              className="w-full h-9 pl-9 rtl:pl-3 rtl:pr-9 bg-iron border border-steel text-white text-[13px] placeholder:text-white/25 focus:border-gold/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* The grid — everything visible, tap once to pick */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* "No picture" tile — always first, own row */}
          <button
            type="button"
            onClick={() => { onSelect(null); onClose(); }}
            className={cn(
              "flex items-center gap-3 w-full border p-2.5 transition-colors",
              !currentUrl ? "border-gold/40 bg-gold/[0.06]" : "border-steel/60 bg-white/[0.02] hover:border-gold/30",
            )}
          >
            <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center text-white/25 bg-iron">
              <ImageOff size={20} />
            </div>
            <span className="text-white/70 text-[13px]">بدون صورة</span>
            {!currentUrl && <Check size={16} className="text-gold mr-auto rtl:mr-0 rtl:ml-auto" />}
          </button>

          {groups.map((group) => (
            <div key={group.type}>
              <p className="text-gold/70 text-[11px] font-bold uppercase tracking-wider mb-2">
                {GROUP_LABEL[group.type]} <span className="text-white/25 font-normal normal-case">({group.items.length})</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {group.items.map((source) => {
                  const selected = currentUrl === source.url;
                  return (
                    <button
                      key={source.url}
                      type="button"
                      onClick={() => { onSelect(source); onClose(); }}
                      className={cn(
                        "relative border transition-colors overflow-hidden text-center",
                        selected ? "border-gold border-2" : "border-steel/60 hover:border-gold/40",
                      )}
                    >
                      <ExerciseImage src={source.url} alt={source.name} className="w-full aspect-square" iconSize={20} />
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 rtl:right-auto rtl:left-1.5 w-5 h-5 rounded-full bg-gold text-void flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      <p className={cn("px-1.5 py-1.5 text-[10px] truncate", selected ? "text-gold bg-gold/[0.08]" : "text-white/60 bg-black/20")}>
                        {source.name}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {totalShown === 0 && (
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
