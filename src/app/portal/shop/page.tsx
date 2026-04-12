"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { OxCheck, OxExternalLink, OxFlame } from "@/components/icons/OxIcons";

type ShopTab = "plan" | "food" | "store";

const mealKeys = ["meal1", "meal2", "meal3", "snack1", "preWorkout"] as const;
const mealTimes = ["7:00 AM", "12:00 PM", "6:00 PM", "3:00 PM", "5:00 PM"];
const mealItemKeys: string[][] = [
  ["shop.oats80g", "shop.eggs3", "shop.banana", "shop.honey"],
  ["shop.chickenBreast200g", "shop.rice200g", "shop.salad"],
  ["shop.salmon180g", "shop.sweetPotato", "shop.broccoli"],
  ["shop.greekYogurt200g", "shop.mixedNuts30g"],
  ["shop.bread2slices", "shop.peanutButter", "shop.coffee"],
];

const foodCategoryKeys = ["shop.catChicken", "shop.catBeef", "shop.catVegetarian", "shop.catSnacks"] as const;
const foodItems = [
  { id: 1, nameKey: "shop.grilledChickenBowl", cal: 520, price: 12, catIdx: 0, image: "🍗", descKey: "shop.grilledChickenBowlDesc" },
  { id: 2, nameKey: "shop.chickenWrap", cal: 450, price: 10, catIdx: 0, image: "🌯", descKey: "shop.chickenWrapDesc" },
  { id: 3, nameKey: "shop.beefSteakPlate", cal: 680, price: 18, catIdx: 1, image: "🥩", descKey: "shop.beefSteakPlateDesc" },
  { id: 4, nameKey: "shop.beefBurgerLean", cal: 550, price: 14, catIdx: 1, image: "🍔", descKey: "shop.beefBurgerLeanDesc" },
  { id: 5, nameKey: "shop.veggiePowerBowl", cal: 380, price: 11, catIdx: 2, image: "🥗", descKey: "shop.veggiePowerBowlDesc" },
  { id: 6, nameKey: "shop.falafelPlate", cal: 420, price: 9, catIdx: 2, image: "🧆", descKey: "shop.falafelPlateDesc" },
  { id: 7, nameKey: "shop.proteinBar", cal: 220, price: 4, catIdx: 3, image: "🍫", descKey: "shop.proteinBarDesc" },
  { id: 8, nameKey: "shop.smoothieBowl", cal: 310, price: 8, catIdx: 3, image: "🥤", descKey: "shop.smoothieBowlDesc" },
];
const storeProducts = [
  { id: 1, nameKey: "shop.wheyProtein", price: 45, image: "💪", descKey: "shop.wheyProteinDesc" },
  { id: 2, nameKey: "shop.creatine", price: 25, image: "⚡", descKey: "shop.creatineDesc" },
  { id: 3, nameKey: "shop.bcaa", price: 30, image: "🧪", descKey: "shop.bcaaDesc" },
  { id: 4, nameKey: "shop.preWorkoutEnergy", price: 35, image: "🔥", descKey: "shop.preWorkoutEnergyDesc" },
  { id: 5, nameKey: "shop.resistanceBands", price: 18, image: "🏋️", descKey: "shop.resistanceBandsDesc" },
  { id: 6, nameKey: "shop.liftingStraps", price: 12, image: "🧤", descKey: "shop.liftingStrapsDesc" },
];

// ── Order Confirmation Modal ────────────────────────────────
function OrderConfirmModal({
  item,
  onClose,
  onConfirm,
}: {
  item: { nameKey: string; price: number; image: string; cal?: number };
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [seconds, setSeconds] = useState(120);

  useEffect(() => {
    if (!confirmed || cancelled) return;
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [confirmed, cancelled, seconds]);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  const handleCancel = () => {
    setCancelled(true);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-5" onClick={onClose}>
      <div className="bg-[#141414] border border-white/[0.08] w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/[0.04] flex items-center justify-center text-[28px] flex-shrink-0 rounded-lg">{item.image}</div>
          <div>
            <p className="text-white text-[17px] font-semibold">{t(item.nameKey)}</p>
            <div className="flex items-center gap-3 mt-1">
              {item.cal && <span className="text-white/35 text-[13px] flex items-center gap-1"><OxFlame size={12} /> {item.cal} {t("shop.cal")}</span>}
              <span className="text-gold text-[15px] font-bold">${item.price}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-lg">
          <p className="text-white/50 text-[13px]">{t("shop.estimatedDelivery")}</p>
          <p className="text-white text-[15px] font-semibold mt-1">{t("shop.deliveryTime")}</p>
        </div>

        {!confirmed ? (
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-white/[0.1] text-white/50 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors">
              {t("common.cancel")}
            </button>
            <button onClick={handleConfirm} className="flex-1 py-3 bg-gold text-void text-[14px] font-bold hover:bg-gold-high active:scale-95 transition-all">
              {t("shop.confirmOrder")}
            </button>
          </div>
        ) : cancelled ? (
          <div className="text-center py-2">
            <p className="text-danger text-[15px] font-semibold">{t("shop.orderCancelled")}</p>
            <button onClick={onClose} className="mt-3 text-white/40 text-[13px] hover:text-white/60 transition-colors">{t("common.close")}</button>
          </div>
        ) : seconds > 0 ? (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-success text-[15px] font-semibold">{t("shop.orderConfirmed")}</p>
            </div>
            <button onClick={handleCancel} className="w-full py-3 border border-danger/30 text-danger text-[14px] font-semibold hover:bg-danger/[0.06] transition-colors">
              {t("shop.cancelOrder")} ({mins}:{secs.toString().padStart(2, "0")})
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-success text-[15px] font-semibold">{t("shop.orderConfirmed")}</p>
            <button onClick={onClose} className="mt-3 text-white/40 text-[13px] hover:text-white/60 transition-colors">{t("common.close")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product Detail Modal ────────────────────────────────────
function ProductDetailModal({
  product,
  onClose,
}: {
  product: { nameKey: string; price: number; image: string; descKey: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-5" onClick={onClose}>
      <div className="bg-[#141414] border border-white/[0.08] w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-square bg-white/[0.02] flex items-center justify-center text-[64px]">{product.image}</div>
        <div className="p-6 space-y-3">
          <p className="text-white text-[20px] font-bold">{t(product.nameKey)}</p>
          <p className="text-white/40 text-[14px] leading-relaxed">{t(product.descKey)}</p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-gold text-[22px] font-bold">${product.price}</span>
            <button className="px-6 py-3 bg-gold text-void text-[14px] font-bold hover:bg-gold-high active:scale-95 transition-all flex items-center gap-2">
              <OxExternalLink size={14} />
              {t("shop.buy")}
            </button>
          </div>
          <button onClick={onClose} className="w-full py-3 text-white/40 text-[13px] hover:text-white/60 transition-colors">
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────
export default function ShopPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ShopTab>("plan");
  const [mealsDone, setMealsDone] = useState<boolean[]>(Array(mealKeys.length).fill(false));
  const [foodFilter, setFoodFilter] = useState(0);
  const [ordered, setOrdered] = useState<Set<number>>(new Set());
  const [orderModal, setOrderModal] = useState<typeof foodItems[number] | null>(null);
  const [productModal, setProductModal] = useState<typeof storeProducts[number] | null>(null);

  function toggleMeal(idx: number) {
    setMealsDone((prev) => prev.map((d, i) => (i === idx ? !d : d)));
  }

  const handleOrderClick = useCallback((item: typeof foodItems[number]) => {
    if (ordered.has(item.id)) return;
    setOrderModal(item);
  }, [ordered]);

  const confirmOrder = useCallback(() => {
    if (orderModal) {
      setOrdered((prev) => new Set(prev).add(orderModal.id));
    }
  }, [orderModal]);

  const tabs: { key: ShopTab; labelKey: string }[] = [
    { key: "plan", labelKey: "store.myPlan" },
    { key: "food", labelKey: "store.orderFood" },
    { key: "store", labelKey: "store.store" },
  ];

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-6">{t("store.title")}</h1>

        {/* Segmented Control */}
        <div className="bg-white/[0.04] rounded-lg p-1 flex mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-3 rounded-md text-[14px] font-semibold transition-all duration-200",
                activeTab === tab.key ? "bg-gold text-void shadow-lg shadow-gold/20" : "text-white/40 hover:text-white/60"
              )}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* My Plan */}
        {activeTab === "plan" && (
          <div className="space-y-3">
            {mealKeys.map((key, idx) => {
              const done = mealsDone[idx];
              return (
                <div key={key} className={cn(
                  "rounded-lg border p-4 transition-all duration-200",
                  done ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06]"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={cn("text-[17px] font-semibold", done ? "text-white/40" : "text-white")}>{t(`shop.${key}`)}</p>
                      <p className="text-white/30 text-[13px] mt-0.5">{mealTimes[idx]}</p>
                    </div>
                    <button
                      onClick={() => toggleMeal(idx)}
                      className={cn(
                        "w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200",
                        done ? "bg-gold text-void" : "bg-white/[0.06] border border-white/[0.08] text-white/20 hover:border-gold/40"
                      )}
                    >
                      <OxCheck size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mealItemKeys[idx].map((itemKey, i) => (
                      <span key={i} className={cn(
                        "text-[13px] px-3 py-1.5 rounded-sm",
                        done ? "bg-white/[0.04] text-white/25" : "bg-white/[0.05] text-white/50"
                      )}>{t(itemKey)}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Order Food */}
        {activeTab === "food" && (
          <div>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
              {foodCategoryKeys.map((catKey, idx) => (
                <button
                  key={catKey}
                  onClick={() => setFoodFilter(idx)}
                  className={cn(
                    "shrink-0 px-5 py-2.5 rounded-md text-[14px] font-medium transition-all duration-200",
                    foodFilter === idx ? "bg-gold text-void" : "bg-white/[0.05] text-white/40 hover:text-white/60"
                  )}
                  style={{ minHeight: "44px" }}
                >{t(catKey)}</button>
              ))}
            </div>
            <div className="space-y-3">
              {foodItems.filter((f) => f.catIdx === foodFilter).map((item) => {
                const isOrdered = ordered.has(item.id);
                return (
                  <div key={item.id} className={cn(
                    "rounded-lg border p-4 flex items-center gap-4 transition-all duration-200",
                    isOrdered ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06]"
                  )}>
                    <div className="w-16 h-16 rounded-lg bg-white/[0.04] flex items-center justify-center text-[28px] flex-shrink-0">{item.image}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[16px] font-semibold">{t(item.nameKey)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/35 text-[13px] flex items-center gap-1"><OxFlame size={12} /> {item.cal} {t("shop.cal")}</span>
                        <span className="text-gold text-[15px] font-bold">${item.price}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOrderClick(item)}
                      disabled={isOrdered}
                      className={cn(
                        "px-4 py-2.5 rounded-md text-[13px] font-bold transition-all duration-200 flex-shrink-0",
                        isOrdered ? "bg-gold/15 text-gold" : "bg-gold text-void hover:bg-gold-high active:scale-95"
                      )}
                      style={{ minHeight: "44px" }}
                    >{isOrdered ? `${t("store.ordered")} ✓` : t("store.order")}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Store */}
        {activeTab === "store" && (
          <div className="grid grid-cols-2 gap-3">
            {storeProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:bg-white/[0.05] hover:border-gold/10 transition-all duration-200 cursor-pointer"
                onClick={() => setProductModal(product)}
              >
                <div className="aspect-square bg-white/[0.02] flex items-center justify-center text-[40px]">{product.image}</div>
                <div className="p-4">
                  <p className="text-white text-[15px] font-semibold leading-tight">{t(product.nameKey)}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-gold text-[17px] font-bold">${product.price}</span>
                    <span className="flex items-center gap-1 text-white/30 text-[12px] font-medium">
                      <OxExternalLink size={12} />{t("shop.buy")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Confirmation Modal */}
      {orderModal && (
        <OrderConfirmModal
          item={{ nameKey: orderModal.nameKey, price: orderModal.price, image: orderModal.image, cal: orderModal.cal }}
          onClose={() => setOrderModal(null)}
          onConfirm={confirmOrder}
        />
      )}

      {/* Product Detail Modal */}
      {productModal && (
        <ProductDetailModal
          product={productModal}
          onClose={() => setProductModal(null)}
        />
      )}
    </div>
  );
}
