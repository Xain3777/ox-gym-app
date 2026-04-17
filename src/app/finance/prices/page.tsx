"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, Percent, Save, AlertTriangle } from "lucide-react";
import {
  loadGymData, saveGymData, applyMargin, computeProfitMargin,
  type StoreItem, type GymDataStore,
} from "@/lib/gymData";

function fmt(n: number, d = 2) {
  return "$" + n.toFixed(d);
}

interface ItemRow extends StoreItem {
  marginInput: string;
}

export default function PricesPage() {
  const [data, setData] = useState<GymDataStore | null>(null);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [saved, setSaved] = useState(false);

  const reload = useCallback(() => {
    const d = loadGymData();
    setData(d);
    setRows(d.storeItems.map((i) => ({ ...i, marginInput: i.profitMargin })));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  function updateRow(id: string, field: keyof ItemRow, value: string | number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        // Recalculate sell price when margin or cost changes
        if (field === "marginInput" || field === "costPriceUSD") {
          const cost = field === "costPriceUSD" ? (value as number) : r.costPriceUSD;
          const margin = field === "marginInput" ? (value as string) : r.marginInput;
          updated.sellPriceUSD = applyMargin(cost, margin);
          updated.profitMargin = margin.trim().endsWith("%")
            ? margin.trim()
            : computeProfitMargin(cost, updated.sellPriceUSD);
        }
        if (field === "sellPriceUSD") {
          updated.profitMargin = computeProfitMargin(r.costPriceUSD, value as number);
          updated.marginInput = updated.profitMargin;
        }
        return updated;
      })
    );
  }

  function handleSave() {
    if (!data) return;
    const updated: GymDataStore = {
      ...data,
      storeItems: rows.map(({ marginInput: _m, ...item }) => item),
    };
    saveGymData(updated);
    setData(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-5 pb-24 md:pb-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign size={22} className="text-gold" />
          <h1 className="font-display text-[26px] tracking-wider text-white">أسعار المنتجات والربح</h1>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 h-9 px-5 bg-gold text-void font-bold text-[13px] hover:bg-gold/90 transition-colors"
        >
          <Save size={14} />
          {saved ? "✓ تم الحفظ" : "حفظ التغييرات"}
        </button>
      </div>

      <p className="text-muted text-[12px]">
        أدخل سعر التكلفة وهامش الربح. يمكنك إدخال <strong className="text-white">نسبة مئوية (مثال: 30%)</strong> أو{" "}
        <strong className="text-white">مبلغ ثابت (مثال: +5 أو 5)</strong>. سيتم احتساب سعر البيع تلقائياً.
      </p>

      <div className="bg-charcoal border border-steel overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-steel">
              <th className="text-right px-4 py-3 text-muted font-normal w-[28%]">المنتج</th>
              <th className="text-center px-4 py-3 text-muted font-normal w-[14%]">التصنيف</th>
              <th className="text-center px-4 py-3 text-muted font-normal w-[13%]">
                <span className="flex items-center justify-center gap-1"><DollarSign size={11}/> التكلفة</span>
              </th>
              <th className="text-center px-4 py-3 text-muted font-normal w-[14%]">
                <span className="flex items-center justify-center gap-1"><Percent size={11}/> الهامش</span>
              </th>
              <th className="text-center px-4 py-3 text-muted font-normal w-[13%]">سعر البيع</th>
              <th className="text-center px-4 py-3 text-muted font-normal w-[13%]">ربح/وحدة</th>
              <th className="text-center px-4 py-3 text-muted font-normal w-[10%]">المخزون</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const profit = row.sellPriceUSD - row.costPriceUSD;
              const isLow = row.stock <= row.lowStockThreshold;
              return (
                <tr key={row.id} className="border-b border-steel/40 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">
                    {isLow && <AlertTriangle size={11} className="inline text-orange-400 ml-1" />}
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] border border-steel/60 text-muted px-2 py-0.5">{row.category}</span>
                  </td>
                  {/* Cost price */}
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <span className="text-muted text-[11px] ml-1">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.costPriceUSD}
                        onChange={(e) => updateRow(row.id, "costPriceUSD", parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 px-2 bg-iron border border-steel text-white text-[12px] text-center focus:border-gold focus:outline-none"
                      />
                    </div>
                  </td>
                  {/* Margin input */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="text"
                      value={row.marginInput}
                      onChange={(e) => updateRow(row.id, "marginInput", e.target.value)}
                      placeholder="30% أو +10"
                      className="w-20 h-8 px-2 bg-iron border border-steel text-white text-[12px] text-center focus:border-gold focus:outline-none placeholder:text-muted/30"
                    />
                  </td>
                  {/* Sell price (editable) */}
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <span className="text-muted text-[11px] ml-1">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.sellPriceUSD}
                        onChange={(e) => updateRow(row.id, "sellPriceUSD", parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 px-2 bg-iron border border-steel text-gold text-[12px] text-center font-semibold focus:border-gold focus:outline-none"
                      />
                    </div>
                  </td>
                  {/* Profit per unit */}
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${profit > 0 ? "text-green-400" : "text-danger"}`}>
                      {fmt(profit)}
                    </span>
                    <span className="text-muted text-[10px] block">{computeProfitMargin(row.costPriceUSD, row.sellPriceUSD)}</span>
                  </td>
                  {/* Stock */}
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={row.stock}
                      onChange={(e) => updateRow(row.id, "stock", parseInt(e.target.value) || 0)}
                      className={`w-16 h-8 px-1 bg-iron border border-steel text-center text-[12px] focus:border-gold focus:outline-none ${
                        isLow ? "text-orange-400 border-orange-500/40" : "text-green-400"
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-muted/50 text-[11px]">
        * سعر البيع هو ما يراه موظف الاستقبال فقط. التكلفة والهامش مخفيان عنه.
      </p>
    </div>
  );
}
