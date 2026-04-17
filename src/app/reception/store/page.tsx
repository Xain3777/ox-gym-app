"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, Plus, AlertTriangle, ChevronDown, Trash2, ShoppingCart } from "lucide-react";
import {
  loadGymData, saveGymData, generateId, subscribeToGymData,
  type StoreItem, type StoreSale, type PaymentMethod, type GymDataStore,
} from "@/lib/gymData";

const PAYMENT_METHODS: PaymentMethod[] = ["نقدي", "بطاقة", "تحويل"];

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" });
}

export default function ReceptionStorePage() {
  const [data, setData] = useState<GymDataStore | null>(null);
  const [selItemId, setSelItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("نقدي");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const reload = useCallback(() => setData(loadGymData()), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { return subscribeToGymData((d) => setData(d)); }, []);

  const items: StoreItem[] = data?.storeItems ?? [];
  const sales: StoreSale[] = data?.storeSales ?? [];
  const todaySales = sales.filter(
    (s) => new Date(s.date).toDateString() === new Date().toDateString()
  );
  const todayTotal = todaySales.reduce((s, x) => s + x.totalUSD, 0);

  const selItem = items.find((i) => i.id === selItemId);
  const lineTotal = selItem ? selItem.sellPriceUSD * qty : 0;

  function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!selItem || qty < 1) return;
    if (selItem.stock < qty) { alert("الكمية غير متوفرة في المخزون"); return; }
    setSaving(true);
    const d = loadGymData();

    // Add sale
    const sale: StoreSale = {
      id: generateId(),
      date: new Date().toISOString(),
      itemId: selItem.id,
      itemName: selItem.name,
      quantity: qty,
      unitPriceUSD: selItem.sellPriceUSD,
      totalUSD: lineTotal,
      paymentMethod,
      staff: "محمد",
    };
    d.storeSales = [sale, ...d.storeSales];

    // Deduct stock
    d.storeItems = d.storeItems.map((i) =>
      i.id === selItem.id ? { ...i, stock: i.stock - qty } : i
    );
    saveGymData(d);
    setData(d);
    setSelItemId("");
    setQty(1);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  function handleDeleteSale(id: string) {
    const d = loadGymData();
    const sale = d.storeSales.find((s) => s.id === id);
    if (sale) {
      // Restore stock
      d.storeItems = d.storeItems.map((i) =>
        i.id === sale.itemId ? { ...i, stock: i.stock + sale.quantity } : i
      );
      d.storeSales = d.storeSales.filter((s) => s.id !== id);
      saveGymData(d);
      setData(d);
    }
  }

  const lowStock = items.filter((i) => i.stock <= i.lowStockThreshold);

  return (
    <div className="p-5 pb-24 md:pb-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag size={22} className="text-gold" />
          <h1 className="font-display text-[26px] tracking-wider text-white">المتجر والمخزون</h1>
        </div>
        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[12px] px-3 py-1.5">
            <AlertTriangle size={13} />
            {lowStock.length} منتج قارب على النفاد
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div className="bg-charcoal border border-steel">
        <div className="px-4 py-3 border-b border-steel flex items-center justify-between">
          <span className="text-white text-[13px] font-semibold">المخزون الحالي</span>
          <span className="text-muted text-[12px]">{items.length} منتج</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-steel">
                <th className="text-right px-4 py-2.5 text-muted font-normal w-[35%]">اسم المنتج</th>
                <th className="text-center px-4 py-2.5 text-muted font-normal w-[18%]">التصنيف</th>
                <th className="text-center px-4 py-2.5 text-muted font-normal w-[15%]">السعر ($)</th>
                <th className="text-center px-4 py-2.5 text-muted font-normal w-[15%]">المخزون</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow = item.stock <= item.lowStockThreshold;
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-steel/30 hover:bg-white/[0.02] ${isLow ? "border-r-2 border-r-orange-500" : ""}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {isLow && <AlertTriangle size={12} className="inline text-orange-400 ml-1.5" />}
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[11px] border border-steel/60 text-muted px-2 py-0.5">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gold font-semibold">
                      {fmt(item.sellPriceUSD)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${isLow ? "text-orange-400" : "text-green-400"}`}>
                        {item.stock}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sell Form */}
      <div className="bg-charcoal border border-gold/30">
        <div className="px-4 py-3 border-b border-steel flex items-center gap-2">
          <ShoppingCart size={14} className="text-gold" />
          <span className="text-white text-[13px] font-semibold">+ بيع سريع</span>
        </div>

        {success && (
          <div className="mx-4 mt-3 bg-green-400/10 border border-green-400/30 text-green-400 text-[13px] px-4 py-2">
            ✓ تم تسجيل البيع بنجاح
          </div>
        )}

        <form onSubmit={handleSell} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            {/* Product */}
            <div className="md:col-span-2">
              <label className="text-muted text-[11px] font-mono uppercase tracking-wider block mb-1.5">المنتج</label>
              <div className="relative">
                <select
                  value={selItemId}
                  onChange={(e) => setSelItemId(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-iron border border-steel text-white text-[13px] focus:border-gold focus:outline-none appearance-none"
                >
                  <option value="" disabled>— اختر منتجاً —</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · {fmt(i.sellPriceUSD)} ({i.stock} متبقي)
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>

            {/* Qty */}
            <div>
              <label className="text-muted text-[11px] font-mono uppercase tracking-wider block mb-1.5">الكمية</label>
              <input
                type="number"
                min={1}
                max={selItem?.stock ?? 99}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-10 px-3 bg-iron border border-steel text-white text-[13px] focus:border-gold focus:outline-none text-center"
              />
            </div>

            {/* Payment */}
            <div>
              <label className="text-muted text-[11px] font-mono uppercase tracking-wider block mb-1.5">الطريقة</label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full h-10 px-3 bg-iron border border-steel text-white text-[13px] focus:border-gold focus:outline-none appearance-none"
                >
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>
          </div>

          {/* Total + submit */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <span className="text-muted text-[12px]">الإجمالي:</span>
              <span className="text-gold font-bold text-[18px]">{fmt(lineTotal)}</span>
            </div>
            <button
              type="submit"
              disabled={saving || !selItemId}
              className="h-10 px-6 bg-gold text-void font-bold text-[13px] flex items-center gap-2 hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              <ShoppingCart size={14} />
              {saving ? "جاري الحفظ..." : "بيع"}
            </button>
          </div>
        </form>
      </div>

      {/* Today's Sales */}
      <div className="bg-charcoal border border-steel">
        <div className="px-4 py-3 border-b border-steel flex items-center justify-between">
          <span className="text-white text-[13px] font-semibold">مبيعات اليوم</span>
          <span className="text-muted text-[12px]">{todaySales.length} معاملة</span>
        </div>

        {todaySales.length === 0 ? (
          <div className="py-8 text-center text-muted text-[13px]">لا توجد مبيعات اليوم</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-steel">
                <th className="text-right px-4 py-2 text-muted font-normal">الوقت</th>
                <th className="text-right px-4 py-2 text-muted font-normal">المنتج</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الكمية</th>
                <th className="text-center px-4 py-2 text-muted font-normal">سعر الوحدة</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الإجمالي</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الطريقة</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الموظف</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {todaySales.map((s) => (
                <tr key={s.id} className="border-b border-steel/30 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-muted">{fmtTime(s.date)}</td>
                  <td className="px-4 py-2.5 text-white font-medium">{s.itemName}</td>
                  <td className="px-4 py-2.5 text-center text-white">{s.quantity}</td>
                  <td className="px-4 py-2.5 text-center text-muted">{fmt(s.unitPriceUSD)}</td>
                  <td className="px-4 py-2.5 text-center text-gold font-semibold">{fmt(s.totalUSD)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="bg-green-400/10 text-green-400 text-[10px] px-1.5 py-0.5">{s.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted">{s.staff}</td>
                  <td className="px-2 py-2.5 text-center">
                    <button onClick={() => handleDeleteSale(s.id)} className="text-muted hover:text-danger transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="px-4 py-2 border-t border-steel flex items-center justify-between">
          <span className="text-muted text-[12px]">إجمالي اليوم</span>
          <span className="text-gold font-bold">{fmt(todayTotal)}</span>
        </div>
      </div>
    </div>
  );
}
