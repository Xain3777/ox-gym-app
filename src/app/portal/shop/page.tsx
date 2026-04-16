"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { supplements } from "@/data/products/supplements";
import { ourProducts } from "@/data/products/our-products";
import { wearables } from "@/data/products/wearables";
import type { Product } from "@/data/products/supplements";

// ── Product detail modal ─────────────────────────────────────────
function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/[0.09] w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg,#3b82f6 0,#3b82f6 6px,transparent 6px,transparent 12px)" }} />
        <div className="aspect-[3/2] bg-white/[0.03] flex items-center justify-center text-[64px]">
          {product.image}
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-white text-[20px] font-bold leading-snug">{product.name}</p>
            {product.badge && (
              <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/20">
                {product.badge}
              </span>
            )}
          </div>
          <p className="text-white/40 text-[14px] leading-relaxed">{product.desc}</p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-blue-400 text-[24px] font-bold">${product.price}</span>
            <button className="px-6 py-3 bg-blue-500 text-white text-[14px] font-bold hover:bg-blue-400 active:scale-95 transition-all">
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
function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <div
      className="bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-blue-500/25 hover:bg-blue-950/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-square bg-white/[0.02] flex items-center justify-center text-[40px]">
        {product.image}
      </div>
      <div className="p-4">
        {product.badge && (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-blue-500/15 text-blue-300 mb-2 border border-blue-500/20">
            {product.badge}
          </span>
        )}
        <p className="text-white text-[14px] font-semibold leading-snug">{product.name}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-blue-400 text-[17px] font-bold">${product.price}</span>
          <span className="text-white/25 text-[12px]">عرض</span>
        </div>
      </div>
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="text-blue-400/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5">{subtitle}</p>
        <p className="text-white font-display text-[22px] tracking-wider leading-none">{title}</p>
      </div>
      <div className="w-8 h-[3px] bg-blue-500/40" />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function StorePage() {
  const [modal, setModal] = useState<Product | null>(null);

  return (
    <div className="min-h-full pb-28 lg:pb-10">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-[#070d1a]" style={{ height: 200 }}>
        {/* top tape */}
        <div className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#3b82f6 0,#3b82f6 14px,#070d1a 14px,#070d1a 28px)", opacity: 0.9 }} />

        {/* figure */}
        <div className="absolute inset-0 flex items-end justify-end rtl:justify-start pr-4 rtl:pl-4 rtl:pr-0 pb-2 z-0 pointer-events-none select-none">
          <div className="relative w-36 h-44 opacity-25">
            <Image src="/fig-bicep.png" alt="" fill className="object-contain object-bottom" unoptimized />
          </div>
        </div>

        {/* diagonal texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(59,130,246,0.04) 28px,rgba(59,130,246,0.04) 30px)" }} />

        <div className="absolute bottom-8 left-0 right-0 z-10 px-5">
          <BackArrow href="/portal" className="mb-2" />
          <p className="font-display text-[38px] leading-none tracking-wider text-blue-400">المتجر</p>
          <p className="text-white/40 text-[13px] mt-1">مكملات · منتجاتنا · ملابس رياضية</p>
        </div>

        {/* bottom tape */}
        <div className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#3b82f6 0,#3b82f6 14px,transparent 14px,transparent 28px)", opacity: 0.4 }} />
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-5 pt-8 space-y-10">

        {/* Section 1 — Supplements */}
        <section>
          <SectionHeader title="المكملات الغذائية" subtitle="تغذية وأداء" />
          <div className="grid grid-cols-2 gap-3">
            {supplements.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => setModal(p)} />
            ))}
          </div>
        </section>

        {/* blue divider */}
        <div className="h-[1px] bg-blue-500/10" />

        {/* Section 2 — Our Products */}
        <section>
          <SectionHeader title="منتجات OX GYM" subtitle="حصري" />
          <div className="grid grid-cols-2 gap-3">
            {ourProducts.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => setModal(p)} />
            ))}
          </div>
        </section>

        {/* blue divider */}
        <div className="h-[1px] bg-blue-500/10" />

        {/* Section 3 — Wearables */}
        <section>
          <SectionHeader title="الملابس والإكسسوارات" subtitle="أسلوب الجيم" />
          <div className="grid grid-cols-2 gap-3">
            {wearables.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => setModal(p)} />
            ))}
          </div>
        </section>

      </div>

      {modal && <ProductModal product={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
