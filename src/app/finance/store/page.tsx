"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, Trash2, Utensils } from "lucide-react";
import {
  loadGymData, saveGymData, subscribeToGymData, computeProfitMargin,
  type GymDataStore,
} from "@/lib/gymData";
import {
  MEAL_OPTIONS,
  formatSyp,
  mealPortionSummaryAr,
  mealProfitSyp,
} from "@/data/meal-cost";

function fmt(n: number) { return "$" + n.toFixed(2); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SY", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" });
}

export default function FinanceStorePage() {
  const [data, setData] = useState<GymDataStore | null>(null);

  const reload = useCallback(() => setData(loadGymData()), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { return subscribeToGymData((d) => setData(d)); }, []);

  const sales = data?.storeSales ?? [];
  const totalRevenue = sales.reduce((s, x) => s + x.totalUSD, 0);
  const totalCost = sales.reduce((s, x) => {
    const item = data?.storeItems.find((i) => i.id === x.itemId);
    return s + (item ? item.costPriceUSD * x.quantity : 0);
  }, 0);
  const totalProfit = totalRevenue - totalCost;

  function handleDelete(id: string) {
    const d = loadGymData();
    const sale = d.storeSales.find((s) => s.id === id);
    if (sale) {
      d.storeItems = d.storeItems.map((i) =>
        i.id === sale.itemId ? { ...i, stock: i.stock + sale.quantity } : i
      );
    }
    d.storeSales = d.storeSales.filter((s) => s.id !== id);
    saveGymData(d);
    setData(loadGymData());
  }

  return (
    <div className="p-5 pb-24 md:pb-6 max-w-5xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Package size={22} className="text-gold" />
        <h1 className="font-display text-[26px] tracking-wider text-white">سجل المتجر</h1>
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="تحديث مباشر" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "عدد المعاملات",   value: sales.length },
          { label: "إجمالي المبيعات", value: fmt(totalRevenue) },
          { label: "إجمالي التكلفة",  value: fmt(totalCost) },
          { label: "إجمالي الربح",    value: fmt(totalProfit) },
        ].map((c) => (
          <div key={c.label} className="bg-charcoal border border-steel p-3 text-center">
            <p className="text-gold font-display text-[18px]">{c.value}</p>
            <p className="text-muted text-[10px] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Meal cost breakdown — manager only */}
      <MealCostCard />

      {/* Full sales log */}
      <div className="bg-charcoal border border-steel overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-steel">
              <th className="text-right px-4 py-2.5 text-muted font-normal">التاريخ والوقت</th>
              <th className="text-right px-4 py-2.5 text-muted font-normal">المنتج</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الكمية</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">سعر البيع</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">التكلفة</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الربح</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">هامش</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الطريقة</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الموظف</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr><td colSpan={10} className="py-10 text-center text-muted">لا توجد مبيعات مسجّلة</td></tr>
            ) : (
              sales.map((s) => {
                const item = data?.storeItems.find((i) => i.id === s.itemId);
                const cost = item ? item.costPriceUSD * s.quantity : 0;
                const profit = s.totalUSD - cost;
                const margin = item ? computeProfitMargin(item.costPriceUSD, item.sellPriceUSD) : "—";
                return (
                  <tr key={s.id} className="border-b border-steel/30 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-muted">{fmtDate(s.date)} {fmtTime(s.date)}</td>
                    <td className="px-4 py-2.5 text-white font-medium">{s.itemName}</td>
                    <td className="px-4 py-2.5 text-center text-white">{s.quantity}</td>
                    <td className="px-4 py-2.5 text-center text-gold font-semibold">{fmt(s.totalUSD)}</td>
                    <td className="px-4 py-2.5 text-center text-muted">{fmt(cost)}</td>
                    <td className="px-4 py-2.5 text-center text-green-400 font-semibold">{fmt(profit)}</td>
                    <td className="px-4 py-2.5 text-center text-muted">{margin}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="bg-green-400/10 text-green-400 text-[10px] px-1.5 py-0.5">{s.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted">{s.staff}</td>
                    <td className="px-2 py-2.5 text-center">
                      <button onClick={() => handleDelete(s.id)} className="text-muted hover:text-danger transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-steel flex justify-between">
          <span className="text-muted text-[12px]">إجمالي الربح</span>
          <span className="text-green-400 font-bold">{fmt(totalProfit)}</span>
        </div>
      </div>
    </div>
  );
}

function MealCostCard() {
  const totalCost   = MEAL_OPTIONS.reduce((s, m) => s + m.costSyp,      0);
  const totalSell   = MEAL_OPTIONS.reduce((s, m) => s + m.sellPriceSyp, 0);
  const totalProfit = totalSell - totalCost;

  return (
    <div className="bg-charcoal border border-steel" dir="rtl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-steel">
        <Utensils size={16} className="text-gold" />
        <h2 className="text-white text-[15px] font-semibold">تكلفة وأرباح الوجبات</h2>
        <span className="text-muted text-[11px] mr-auto">يظهر للمدير فقط</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-steel/60">
              <th className="text-right px-4 py-2.5 text-muted font-normal">الوجبة</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">التكلفة</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">سعر البيع</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الربح</th>
            </tr>
          </thead>
          <tbody>
            {MEAL_OPTIONS.map((meal) => (
              <tr key={meal.id} className="border-b border-steel/30 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{meal.nameAr}</p>
                  <p className="text-white/45 text-[12px] mt-0.5">{mealPortionSummaryAr(meal)}</p>
                </td>
                <td className="px-4 py-3 text-center text-white/80 font-mono">{formatSyp(meal.costSyp)}</td>
                <td className="px-4 py-3 text-center text-gold font-mono">{formatSyp(meal.sellPriceSyp)}</td>
                <td className="px-4 py-3 text-center text-green-400 font-mono font-semibold">
                  {formatSyp(mealProfitSyp(meal))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-iron/40">
              <td className="px-4 py-2.5 text-white/60 text-[12px]">الإجمالي</td>
              <td className="px-4 py-2.5 text-center text-white/70 font-mono text-[12px]">{formatSyp(totalCost)}</td>
              <td className="px-4 py-2.5 text-center text-gold font-mono text-[12px]">{formatSyp(totalSell)}</td>
              <td className="px-4 py-2.5 text-center text-green-400 font-mono font-bold">{formatSyp(totalProfit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
