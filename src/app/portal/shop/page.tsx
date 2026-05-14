"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";

// ── Types ────────────────────────────────────────────────────────
type CatalogItem = {
  id: string;
  name: string;
  category: string | null;
  item_type: string | null;
  sell_currency: "usd" | "syp" | null;
  sell_price: number | null;
  description: string | null;
  image_url: string | null;
};

const mainCategories = [
  { id: "supplements", label: "مكملات",         color: "#3b82f6" },
  { id: "wearables",   label: "ملابس رياضية",   color: "#a855f7" },
  { id: "our-store",   label: "متجرنا",          color: "#F5C100" },
] as const;

type MainCat = (typeof mainCategories)[number]["id"];

const accentColors: Record<MainCat, { text: string; bg: string; border: string; tape: string }> = {
  "supplements": { text: "text-blue-400",   bg: "bg-blue-500",   border: "border-blue-500/30", tape: "#3b82f6" },
  "wearables":   { text: "text-purple-400", bg: "bg-purple-500", border: "border-purple-500/30", tape: "#a855f7" },
  "our-store":   { text: "text-gold",       bg: "bg-gold",       border: "border-gold/30",     tape: "#F5C100" },
};

// ── Price formatting ─────────────────────────────────────────────
function formatPrice(price: number | null | undefined, currency: "usd" | "syp" | null | undefined): string {
  if (price == null) return "—";
  if (currency === "syp") {
    return `${Math.round(price).toLocaleString("en-US")} ل.س`;
  }
  return `$${price}`;
}

// ── Brand sub-category derivation ────────────────────────────────
function brandOf(name: string): string {
  const upper = name.toUpperCase();
  if (upper.startsWith("LEVRONE")) return "LEVRONE";
  if (upper.startsWith("OLIMP")) return "OLIMP";
  if (upper.startsWith("YAVA")) return "YAVA LABS";
  if (upper.startsWith("BAD ASS")) return "BAD ASS";
  return "أخرى";
}

// ── Item type → fallback icon glyph ──────────────────────────────
function itemIcon(item: CatalogItem): string {
  const t = (item.item_type ?? "").toLowerCase();
  const cat = (item.category ?? "").toLowerCase();
  if (t === "water") return "💧";
  if (t === "drink") return "🥤";
  if (cat === "accessories") return "🥤";
  if (t === "supplement") return "💪";
  return "🛒";
}

// ── Product image renderer ───────────────────────────────────────
function ProductImage({ src, alt, sizes, glyphSize, fallbackGlyph }: {
  src: string | null;
  alt: string;
  sizes: string;
  glyphSize: string;
  fallbackGlyph: string;
}) {
  if (src && src.startsWith("/")) {
    return (
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    );
  }
  return (
    <span className={cn("flex items-center justify-center w-full h-full", glyphSize)}>
      {fallbackGlyph}
    </span>
  );
}

// ── Detail modal (centered, scrollable inside) ───────────────────
function ProductModal({ item, accent, onClose }: { item: CatalogItem; accent: typeof accentColors[MainCat]; onClose: () => void }) {
  const glyph = itemIcon(item);
  const price = formatPrice(item.sell_price, item.sell_currency);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/[0.09] w-full max-w-sm max-h-full overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ backgroundImage: `repeating-linear-gradient(90deg,${accent.tape} 0,${accent.tape} 6px,transparent 6px,transparent 12px)` }} />
        <div className="relative aspect-[3/2] bg-white/[0.03] overflow-hidden">
          <ProductImage
            src={item.image_url}
            alt={item.name}
            sizes="(max-width: 640px) 100vw, 384px"
            glyphSize="text-[72px]"
            fallbackGlyph={glyph}
          />
        </div>
        <div className="p-6 space-y-3" dir="rtl">
          <div className="flex items-start justify-between gap-3">
            <p className="text-white text-[20px] font-bold leading-snug">{item.name}</p>
          </div>
          {item.description && (
            <p className="text-white/40 text-[14px] leading-relaxed">{item.description}</p>
          )}
          <p className={cn("text-[22px] font-bold", accent.text)} dir="ltr">{price}</p>
          <button onClick={onClose} className="w-full py-3 text-white/30 text-[13px] hover:text-white/50 transition-colors">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product card ─────────────────────────────────────────────────
function ProductCard({ item, accent, onClick }: { item: CatalogItem; accent: typeof accentColors[MainCat]; onClick: () => void }) {
  const glyph = itemIcon(item);
  const price = formatPrice(item.sell_price, item.sell_currency);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-right bg-white/[0.03] border border-white/[0.06] overflow-hidden active:scale-[0.98] transition-all duration-200",
        "hover:border-opacity-50",
      )}
    >
      <div className="relative aspect-square bg-white/[0.02] overflow-hidden">
        <ProductImage
          src={item.image_url}
          alt={item.name}
          sizes="(max-width: 640px) 50vw, 200px"
          glyphSize="text-[44px]"
          fallbackGlyph={glyph}
        />
      </div>
      <div className="p-3" dir="rtl">
        <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2 min-h-[34px]">{item.name}</p>
        <div className="flex items-center justify-between mt-2 gap-2">
          <span className={cn("text-[14px] font-bold", accent.text)} dir="ltr">{price}</span>
          <span className="text-white/25 text-[11px]">عرض</span>
        </div>
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function StorePage() {
  const [mainCat, setMainCat] = useState<MainCat>("supplements");
  const [subCat, setSubCat] = useState("الكل");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<CatalogItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/portal/store");
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) setItems(json.data ?? []);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const accent = accentColors[mainCat];

  // Filter pool per tab + only-with-pics rule for supplements
  const tabItems = useMemo<CatalogItem[]>(() => {
    if (mainCat === "supplements") {
      // supplements + accessories (shakers fit here too if they have pics)
      return items.filter((i) =>
        (i.category === "supplements" || i.category === "accessories")
        && !!i.image_url, // PIC-ONLY rule for this tab
      );
    }
    if (mainCat === "our-store") {
      // water, BCAA, pre-workout, snacks, etc. — always show with prices, pic optional
      return items.filter((i) =>
        i.category === "other"
        || i.category === "meal_addons"
        || i.category === "meals",
      );
    }
    return [];
  }, [items, mainCat]);

  // Sub-categories derived from the active tab's items
  const subCats = useMemo<string[]>(() => {
    if (mainCat === "supplements") {
      const brands = Array.from(new Set(tabItems.map((i) => brandOf(i.name))));
      return ["الكل", ...brands.sort((a, b) => (a === "أخرى" ? 1 : b === "أخرى" ? -1 : a.localeCompare(b)))];
    }
    if (mainCat === "our-store") {
      const types = Array.from(new Set(
        tabItems.map((i) => labelForOurStoreSub(i)),
      ));
      return ["الكل", ...types.filter(Boolean) as string[]];
    }
    return ["الكل"];
  }, [tabItems, mainCat]);

  const visible = useMemo<CatalogItem[]>(() => {
    if (subCat === "الكل") return tabItems;
    if (mainCat === "supplements") return tabItems.filter((i) => brandOf(i.name) === subCat);
    if (mainCat === "our-store") return tabItems.filter((i) => labelForOurStoreSub(i) === subCat);
    return tabItems;
  }, [tabItems, subCat, mainCat]);

  function switchMain(cat: MainCat) {
    setMainCat(cat);
    setSubCat("الكل");
  }

  const heroTitles: Record<MainCat, string> = {
    "supplements": "المكملات الغذائية",
    "wearables":   "الملابس الرياضية",
    "our-store":   "متجر OX GYM",
  };
  const heroSubs: Record<MainCat, string> = {
    "supplements": "تغذية وأداء وتعافي",
    "wearables":   "أسلوب جيم — ملابس وإكسسوارات",
    "our-store":   "منتجات حصرية من OX GYM",
  };

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="relative w-full overflow-hidden bg-[#070d1a]" style={{ height: 200 }}>
        <div className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{ backgroundImage: `repeating-linear-gradient(90deg,${accent.tape} 0,${accent.tape} 14px,transparent 14px,transparent 28px)`, opacity: 0.9 }}
        />
        <div className="absolute inset-0 flex items-end justify-end pb-2 z-0 pointer-events-none select-none pr-4">
          <div className="relative w-36 h-44 opacity-20">
            <Image src="/fig-bicep.png" alt="" fill className="object-contain object-bottom" unoptimized />
          </div>
        </div>
        <div className="absolute bottom-8 left-0 right-0 z-10 px-5" dir="rtl">
          <BackArrow href="/portal" className="mb-2" />
          <p className={cn("font-display text-[38px] leading-none tracking-wider", accent.text)}>
            {heroTitles[mainCat]}
          </p>
          <p className="text-white/40 text-[13px] mt-1">{heroSubs[mainCat]}</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{ backgroundImage: `repeating-linear-gradient(90deg,${accent.tape} 0,${accent.tape} 14px,transparent 14px,transparent 28px)`, opacity: 0.4 }}
        />
      </div>

      <div className="bg-[#0a0a0a] border-b border-white/[0.06] sticky top-0 z-20">
        <div className="flex max-w-lg mx-auto" dir="rtl">
          {mainCategories.map((cat) => {
            const isActive = mainCat === cat.id;
            const catAccent = accentColors[cat.id as MainCat];
            return (
              <button
                key={cat.id}
                onClick={() => switchMain(cat.id as MainCat)}
                className={cn(
                  "flex-1 py-4 text-[14px] font-semibold transition-all duration-200 border-b-2",
                  isActive
                    ? cn(catAccent.text, "border-current")
                    : "text-white/35 border-transparent hover:text-white/55"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#0d0d0d] border-b border-white/[0.04]">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide max-w-lg mx-auto" dir="rtl">
          {subCats.map((sub) => {
            const isActive = subCat === sub;
            return (
              <button
                key={sub}
                onClick={() => setSubCat(sub)}
                className={cn(
                  "shrink-0 px-4 py-2 text-[13px] font-medium transition-all duration-200 border",
                  isActive
                    ? cn(accent.text, accent.border, "font-bold")
                    : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
                )}
                style={isActive ? { background: `${accent.tape}15` } : undefined}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-6">
        {mainCat === "wearables" ? (
          <div className="text-center py-20 px-6">
            <p className={cn("font-display text-[36px] tracking-[0.06em] leading-none mb-3", accent.text)}>قريباً</p>
            <p className="text-white/40 text-[14px] leading-relaxed">
              قسم الملابس الرياضية والإكسسوارات في طريقه — ترقبوه قريباً.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-16 text-white/30 text-[14px]">جار تحميل المنتجات...</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-white/25 text-[14px]">
            {mainCat === "supplements"
              ? "لا توجد منتجات بصور في هذه الفئة بعد."
              : "لا توجد منتجات في هذه الفئة."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((item) => (
              <ProductCard key={item.id} item={item} accent={accent} onClick={() => setModal(item)} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ProductModal item={modal} accent={accent} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function labelForOurStoreSub(item: CatalogItem): string {
  const t = (item.item_type ?? "").toLowerCase();
  if (t === "water") return "ماء";
  if (t === "drink") return "مشروبات";
  if (t === "meal")  return "وجبات وإضافات";
  if (item.category === "accessories") return "إكسسوارات";
  return "أخرى";
}
