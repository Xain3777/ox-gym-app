"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxFlame, OxCheck } from "@/components/icons/OxIcons";

// ── Meal catalogue ──────────────────────────────────────────────
const foodCategories = ["الكل", "دجاج", "لحم بقر", "نباتي", "وجبات خفيفة"] as const;

const foodItems = [
  { id: 1, name: "طبق دجاج مشوي", cal: 520, price: 12, cat: 1, image: "🍗", desc: "صدر دجاج مشوي مع أرز وخضروات طازجة وصلصة خاصة." },
  { id: 2, name: "راب دجاج", cal: 450, price: 10, cat: 1, image: "🌯", desc: "راب قمح كامل مع دجاج مشوي وخس وطماطم وصلصة خفيفة." },
  { id: 3, name: "طبق ستيك لحم", cal: 680, price: 18, cat: 2, image: "🥩", desc: "ستيك لحم بقري مميز مع خضروات مشوية وبطاطا حلوة." },
  { id: 4, name: "برغر لحم قليل الدهون", cal: 550, price: 14, cat: 2, image: "🍔", desc: "شريحة لحم بقري قليلة الدهون على خبز قمح كامل." },
  { id: 5, name: "طبق الخضروات القوي", cal: 380, price: 11, cat: 3, image: "🥗", desc: "كينوا وحمص محمص وأفوكادو وخضروات مشكلة مع طحينة." },
  { id: 6, name: "طبق فلافل", cal: 420, price: 9, cat: 3, image: "🧆", desc: "فلافل مقرمشة مع حمص وسلطة وخبز عربي دافئ." },
  { id: 7, name: "بار بروتين", cal: 220, price: 4, cat: 4, image: "🍫", desc: "بار بروتين عالي البروتين بالشوكولاتة وزبدة الفول السوداني." },
  { id: 8, name: "طبق سموذي", cal: 310, price: 8, cat: 4, image: "🥤", desc: "آساي مخلوط مع موز وغرانولا وتوت طازج." },
];

// ── 2-min cancellation timer modal ─────────────────────────────
function OrderModal({
  item,
  onClose,
  onConfirmed,
}: {
  item: (typeof foodItems)[number];
  onClose: () => void;
  onConfirmed: (id: number) => void;
}) {
  const [phase, setPhase] = useState<"confirm" | "counting" | "done">("confirm");
  const [seconds, setSeconds] = useState(120);

  useEffect(() => {
    if (phase !== "counting") return;
    if (seconds <= 0) { setPhase("done"); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, seconds]);

  const confirm = () => { onConfirmed(item.id); setPhase("counting"); };
  const cancel  = () => { setPhase("done"); onClose(); };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0" onClick={onClose}>
      <div
        className="bg-[#111] border border-white/[0.09] w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* green top stripe */}
        <div className="h-1 w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0,#10b981 6px,transparent 6px,transparent 12px)" }} />

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/[0.04] flex items-center justify-center text-[30px] rounded-lg flex-shrink-0">{item.image}</div>
            <div>
              <p className="text-white text-[17px] font-semibold">{item.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-white/35 text-[13px] flex items-center gap-1"><OxFlame size={12} />{item.cal} سعرة</span>
                <span className="text-emerald-400 text-[16px] font-bold">${item.price}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            <p className="text-white/50 text-[13px]">وقت التوصيل المتوقع</p>
            <p className="text-white text-[15px] font-semibold mt-0.5">١٥-٢٥ دقيقة</p>
          </div>

          {phase === "confirm" && (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border border-white/[0.1] text-white/50 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors">إلغاء</button>
              <button onClick={confirm} className="flex-1 py-3 bg-emerald-500 text-white text-[14px] font-bold hover:bg-emerald-400 active:scale-95 transition-all">تأكيد الطلب</button>
            </div>
          )}

          {phase === "counting" && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-emerald-400 text-[16px] font-semibold">✓ تم تأكيد الطلب</p>
                <p className="text-white/30 text-[13px] mt-1">يمكنك الإلغاء خلال</p>
                <p className="text-white font-mono text-[28px] font-bold mt-1">{mm}:{ss}</p>
              </div>
              <button onClick={cancel} className="w-full py-3 border border-danger/30 text-danger text-[14px] font-semibold hover:bg-danger/[0.06] transition-colors">
                إلغاء الطلب
              </button>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center py-2">
              <p className="text-emerald-400 text-[16px] font-semibold">✓ الطلب قيد التحضير</p>
              <button onClick={onClose} className="mt-3 text-white/40 text-[13px] hover:text-white/60">إغلاق</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function OrderMealPage() {
  const [catIdx, setCatIdx] = useState(0);
  const [ordered, setOrdered] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<(typeof foodItems)[number] | null>(null);

  const handleOrder = useCallback((item: (typeof foodItems)[number]) => {
    if (ordered.has(item.id)) return;
    setModal(item);
  }, [ordered]);

  const handleConfirmed = useCallback((id: number) => {
    setOrdered((prev) => new Set(prev).add(id));
  }, []);

  const visible = catIdx === 0 ? foodItems : foodItems.filter((f) => f.cat === catIdx);

  return (
    <div className="min-h-full pb-28 lg:pb-10">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-[#071a12]" style={{ height: 200 }}>
        {/* top tape */}
        <div className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0,#10b981 14px,#071a12 14px,#071a12 28px)", opacity: 0.9 }} />

        {/* figure */}
        <div className="absolute inset-0 flex items-end justify-end rtl:justify-start pr-4 rtl:pl-4 rtl:pr-0 pb-2 z-0 pointer-events-none select-none">
          <div className="relative w-36 h-44 opacity-25">
            <Image src="/fig-charge.png" alt="" fill className="object-contain object-bottom" unoptimized />
          </div>
        </div>

        {/* diagonal grid texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(16,185,129,0.04) 28px,rgba(16,185,129,0.04) 30px)" }} />

        <div className="absolute bottom-8 left-0 right-0 z-10 px-5">
          <BackArrow href="/portal" className="mb-2" />
          <p className="font-display text-[38px] leading-none tracking-wider text-emerald-400">اطلب وجبة</p>
          <p className="text-white/40 text-[13px] mt-1">وجبات طازجة محضّرة خصيصاً لك</p>
        </div>

        {/* bottom tape */}
        <div className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{ backgroundImage: "repeating-linear-gradient(90deg,#10b981 0,#10b981 14px,transparent 14px,transparent 28px)", opacity: 0.4 }} />
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-5 pt-6">

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide mb-2">
          {foodCategories.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => setCatIdx(idx)}
              className={cn(
                "shrink-0 px-5 py-2.5 text-[14px] font-medium transition-all duration-200",
                catIdx === idx
                  ? "bg-emerald-500 text-white"
                  : "bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white/60"
              )}
              style={{ minHeight: 44 }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-3">
          {visible.map((item) => {
            const isOrdered = ordered.has(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "border p-4 flex items-center gap-4 transition-all duration-200",
                  isOrdered
                    ? "bg-emerald-950/30 border-emerald-500/25"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/20"
                )}
              >
                <div className="w-16 h-16 bg-white/[0.04] flex items-center justify-center text-[28px] flex-shrink-0 rounded-lg">
                  {item.image}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[16px] font-semibold">{item.name}</p>
                  <p className="text-white/30 text-[12px] mt-0.5 leading-snug line-clamp-1">{item.desc}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-white/35 text-[13px] flex items-center gap-1">
                      <OxFlame size={12} />{item.cal} سعرة
                    </span>
                    <span className="text-emerald-400 text-[15px] font-bold">${item.price}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleOrder(item)}
                  disabled={isOrdered}
                  className={cn(
                    "px-4 py-2.5 text-[13px] font-bold transition-all duration-200 flex-shrink-0 flex items-center gap-1.5",
                    isOrdered
                      ? "bg-emerald-500/15 text-emerald-400 cursor-default"
                      : "bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95"
                  )}
                  style={{ minHeight: 44 }}
                >
                  {isOrdered ? <><OxCheck size={14} /> تم</> : "اطلب"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <OrderModal
          item={modal}
          onClose={() => setModal(null)}
          onConfirmed={handleConfirmed}
        />
      )}
    </div>
  );
}
