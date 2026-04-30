"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { supplements } from "@/data/products/supplements";
import { ourProducts } from "@/data/products/our-products";
import { wearables } from "@/data/products/wearables";
import type { Product } from "@/data/products/supplements";

// ── Category data ─────────────────────────────────────────────────
const mainCategories = [
  { id: "supplements", label: "مكملات",         color: "#3b82f6" },
  { id: "wearables",   label: "ملابس رياضية",   color: "#a855f7" },
  { id: "our-store",   label: "متجرنا",          color: "#F5C100" },
] as const;

type MainCat = (typeof mainCategories)[number]["id"];

const subCategoryMap: Record<MainCat, string[]> = {
  "supplements": ["الكل", "واي بروتين", "كرياتين", "BCAA", "ما قبل التمرين", "فيتامينات"],
  "wearables":   ["الكل"],
  "our-store":   ["الكل"],
};

const productsByMain: Record<MainCat, Product[]> = {
  "supplements": supplements,
  "wearables":   wearables,
  "our-store":   ourProducts,
};

const accentColors: Record<MainCat, { text: string; bg: string; border: string; tape: string }> = {
  "supplements": { text: "text-blue-400",   bg: "bg-blue-500",   border: "border-blue-500/30", tape: "#3b82f6" },
  "wearables":   { text: "text-purple-400", bg: "bg-purple-500", border: "border-purple-500/30", tape: "#a855f7" },
  "our-store":   { text: "text-gold",       bg: "bg-gold",       border: "border-gold/30",     tape: "#F5C100" },
};

// ── Product detail modal ─────────────────────────────────────────
function ProductModal({ product, accent, onClose }: { product: Product; accent: typeof accentColors[MainCat]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/[0.09] w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ backgroundImage: `repeating-linear-gradient(90deg,${accent.tape} 0,${accent.tape} 6px,transparent 6px,transparent 12px)` }} />
        <div className="aspect-[3/2] bg-white/[0.03] flex items-center justify-center text-[64px]">
          {product.image}
        </div>
        <div className="p-6 space-y-3" dir="rtl">
          <div className="flex items-start justify-between gap-3">
            <p className="text-white text-[20px] font-bold leading-snug">{product.name}</p>
            {product.badge && (
              <span className={cn("shrink-0 text-[11px] font-bold px-2.5 py-1 border", accent.text, accent.border)}
                style={{ background: `${accent.tape}22` }}>
                {product.badge}
              </span>
            )}
          </div>
          <p className="text-white/40 text-[14px] leading-relaxed">{product.desc}</p>
          <div className="flex items-center justify-between pt-2">
            <span className={cn("text-[24px] font-bold", accent.text)}>${product.price}</span>
            <button className={cn("px-6 py-3 text-[14px] font-bold transition-all active:scale-95", accent.bg, accent.bg.startsWith("bg-gold") ? "text-void" : "text-white")}>
              أضف للسلة
            </button>
          </div>
          <button onClick={onClose} className="w-full py-3 text-white/30 text-[13px] hover:text-white/50 transition-colors">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product card ─────────────────────────────────────────────────
function ProductCard({ product, accent, onClick }: { product: Product; accent: typeof accentColors[MainCat]; onClick: () => void }) {
  return (
    <div
      className={cn("bg-white/[0.03] border border-white/[0.06] overflow-hidden active:scale-[0.98] transition-all duration-200 cursor-pointer hover:border-opacity-50", `hover:${accent.border}`)}
      style={{ borderColor: undefined }}
      onClick={onClick}
    >
      <div className="aspect-square bg-white/[0.02] flex items-center justify-center text-[40px]">
        {product.image}
      </div>
      <div className="p-3" dir="rtl">
        {product.badge && (
          <span className={cn("inline-block text-[10px] font-bold px-2 py-0.5 mb-1.5 border", accent.text, accent.border)}
            style={{ background: `${accent.tape}18` }}>
            {product.badge}
          </span>
        )}
        <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between mt-2">
          <span className={cn("text-[17px] font-bold", accent.text)}>${product.price}</span>
          <span className="text-white/25 text-[12px]">عرض</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function StorePage() {
  const [mainCat, setMainCat] = useState<MainCat>("supplements");
  const [subCat, setSubCat] = useState("الكل");
  const [modal, setModal] = useState<Product | null>(null);

  const accent = accentColors[mainCat];
  const subCats = subCategoryMap[mainCat];
  const allProducts = productsByMain[mainCat];
  const visibleProducts = subCat === "الكل"
    ? allProducts
    : allProducts.filter((p) => p.subCategory === subCat);

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

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-[#070d1a]" style={{ height: 200 }}>
        <div className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{ backgroundImage: `repeating-linear-gradient(90deg,${accent.tape} 0,${accent.tape} 14px,transparent 14px,transparent 28px)`, opacity: 0.9 }}
        />
        <div className="absolute inset-0 flex items-end justify-end pb-2 z-0 pointer-events-none select-none pr-4">
          <div className="relative w-36 h-44 opacity-20">
            <Image src="/fig-bicep.png" alt="" fill className="object-contain object-bottom" unoptimized />
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent 0,transparent 28px,${accent.tape}0A 28px,${accent.tape}0A 30px)` }}
        />
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

      {/* ── Main category tabs ────────────────────────────── */}
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

      {/* ── Sub-category tabs ─────────────────────────────── */}
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

      {/* ── Products grid ─────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-5 pb-6">
        {mainCat === "wearables" ? (
          <div className="text-center py-20 px-6">
            <p className={cn("font-display text-[36px] tracking-[0.06em] leading-none mb-3", accent.text)}>
              قريباً
            </p>
            <p className="text-white/40 text-[14px] leading-relaxed">
              قسم الملابس الرياضية والإكسسوارات في طريقه — ترقبوه قريباً.
            </p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-16 text-white/25 text-[14px]">لا توجد منتجات في هذه الفئة</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleProducts.map((p) => (
              <ProductCard key={p.id} product={p} accent={accent} onClick={() => setModal(p)} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal}
          accent={accent}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
