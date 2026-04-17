"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Activity, ShoppingBag, Users,
  DollarSign, Percent, ChevronDown, ChevronUp, FileSpreadsheet,
} from "lucide-react";
import {
  loadGymData, saveGymData, subscribeToGymData,
  INBODY_PRICE_MEMBER_SYP, USD_TO_SYP_RATE,
  type GymDataStore,
} from "@/lib/gymData";
import * as XLSX from "xlsx";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtSYP(n: number) {
  return n.toLocaleString("ar-SY") + " ل.س";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SY", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" });
}

type Period = "today" | "week" | "month";

function inRange(isoDate: string, period: Period): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  if (period === "today") return d.toDateString() === now.toDateString();
  if (period === "week") {
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 7);
    return d >= cutoff;
  }
  // month
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function FinanceDashboardPage() {
  const [data, setData] = useState<GymDataStore | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const reload = useCallback(() => setData(loadGymData()), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { return subscribeToGymData((d) => setData(d)); }, []);

  if (!data) return <div className="p-8 text-muted text-center">جاري التحميل...</div>;

  // ── Revenue calculations ───────────────────────────────────────
  const inbodySessions = data.inbodySessions.filter((s) => inRange(s.date, period));
  const inbodyRevenueSYP = inbodySessions.reduce((s, x) => s + x.priceSYP, 0);
  const inbodyRevenueUSD = inbodyRevenueSYP / USD_TO_SYP_RATE;

  const storeSales = data.storeSales.filter((s) => inRange(s.date, period));
  const storeRevenueUSD = storeSales.reduce((s, x) => s + x.totalUSD, 0);
  const storeCostUSD = storeSales.reduce((s, x) => {
    const item = data.storeItems.find((i) => i.id === x.itemId);
    return s + (item ? item.costPriceUSD * x.quantity : 0);
  }, 0);
  const storeProfitUSD = storeRevenueUSD - storeCostUSD;

  const subsRevenue = data.subscriptions.filter((s) => inRange(s.date, period))
    .reduce((s, x) => s + x.amountUSD, 0);

  const totalRevenueUSD = inbodyRevenueUSD + storeRevenueUSD + subsRevenue;

  // ── Expenses ──────────────────────────────────────────────────
  const salaryExpenses = data.salaries
    .filter((s) => {
      const [yr, mo] = s.month.split("-");
      const now = new Date();
      if (period === "month") return parseInt(yr) === now.getFullYear() && parseInt(mo) === now.getMonth() + 1;
      return true;
    })
    .reduce((s, x) => s + x.monthlySalaryUSD, 0);

  const otherExpenses = data.expenses.filter((e) => inRange(e.date, period))
    .reduce((s, e) => s + e.amountUSD, 0);

  const totalExpenses = salaryExpenses + otherExpenses;
  const netProfit = totalRevenueUSD - totalExpenses;

  // ── Category breakdown for pie ────────────────────────────────
  const storeByCategory: Record<string, number> = {};
  storeSales.forEach((s) => {
    const item = data.storeItems.find((i) => i.id === s.itemId);
    const cat = item?.category ?? "أخرى";
    storeByCategory[cat] = (storeByCategory[cat] ?? 0) + s.totalUSD;
  });

  // ── Excel export ─────────────────────────────────────────────
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // InBody sheet
    const inbodyRows = [
      ["التاريخ", "العضو", "النوع", "السعر (ل.س)", "طريقة الدفع", "الموظف"],
      ...data!.inbodySessions.map((s) => [
        fmtDate(s.date),
        s.memberName,
        s.isGymMember ? "عضو" : "زائر",
        s.priceSYP,
        s.paymentMethod,
        s.staff,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inbodyRows), "InBody");

    // Store sheet
    const storeRows = [
      ["التاريخ", "المنتج", "الكمية", "سعر الوحدة ($)", "الإجمالي ($)", "طريقة الدفع", "الموظف"],
      ...data!.storeSales.map((s) => [
        fmtDate(s.date), s.itemName, s.quantity, s.unitPriceUSD, s.totalUSD, s.paymentMethod, s.staff,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(storeRows), "المتجر");

    // Summary sheet
    const month = new Date().toLocaleDateString("ar-SY", { month: "long", year: "numeric" });
    const summaryRows = [
      ["الملخص المالي الشهري —", month],
      [],
      ["المصدر", "المبلغ ($)"],
      ["InBody", inbodyRevenueUSD.toFixed(2)],
      ["المتجر", storeRevenueUSD.toFixed(2)],
      ["الاشتراكات", subsRevenue.toFixed(2)],
      ["إجمالي الإيرادات", totalRevenueUSD.toFixed(2)],
      [],
      ["المصروفات", ""],
      ["الرواتب", salaryExpenses.toFixed(2)],
      ["مصروفات أخرى", otherExpenses.toFixed(2)],
      ["إجمالي المصروفات", totalExpenses.toFixed(2)],
      [],
      ["صافي الربح", netProfit.toFixed(2)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "الملخص");

    XLSX.writeFile(wb, `OX-GYM-${new Date().toISOString().slice(0, 7)}.xlsx`);
  }

  const PERIOD_LABELS: Record<Period, string> = {
    today: "اليوم",
    week: "هذا الأسبوع",
    month: "هذا الشهر",
  };

  function toggle(s: string) {
    setExpandedSection(expandedSection === s ? null : s);
  }

  return (
    <div className="p-5 pb-24 md:pb-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={22} className="text-gold" />
          <h1 className="font-display text-[26px] tracking-wider text-white">الملخص المالي</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex border border-steel">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-[12px] font-mono transition-colors ${
                  period === p ? "bg-gold text-void" : "text-muted hover:text-white"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          {/* Excel export */}
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 h-9 px-4 bg-green-700/20 border border-green-600/40 text-green-400 text-[12px] hover:bg-green-700/30 transition-colors"
          >
            <FileSpreadsheet size={14} />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        تحديث مباشر · آخر تحديث: {new Date(data.lastUpdated).toLocaleTimeString("ar-SY")}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          icon={<TrendingUp size={16} className="text-gold" />}
          label="إجمالي الإيرادات"
          value={fmt(totalRevenueUSD)}
          sub={fmtSYP(Math.round(totalRevenueUSD * USD_TO_SYP_RATE))}
          positive
        />
        <KpiCard
          icon={<TrendingDown size={16} className="text-danger" />}
          label="إجمالي المصروفات"
          value={fmt(totalExpenses)}
          sub={`رواتب: ${fmt(salaryExpenses)}`}
          positive={false}
        />
        <KpiCard
          icon={<DollarSign size={16} className={netProfit >= 0 ? "text-green-400" : "text-danger"} />}
          label="صافي الربح"
          value={fmt(netProfit)}
          sub={netProfit >= 0 ? "ربح" : "خسارة"}
          positive={netProfit >= 0}
          highlight
        />
        <KpiCard
          icon={<Activity size={16} className="text-gold" />}
          label="إيراد InBody"
          value={fmtSYP(inbodyRevenueSYP)}
          sub={`${inbodySessions.length} جلسة`}
          positive
        />
        <KpiCard
          icon={<ShoppingBag size={16} className="text-gold" />}
          label="إيراد المتجر"
          value={fmt(storeRevenueUSD)}
          sub={`ربح: ${fmt(storeProfitUSD)}`}
          positive
        />
        <KpiCard
          icon={<Users size={16} className="text-gold" />}
          label="إيراد الاشتراكات"
          value={fmt(subsRevenue)}
          sub={`${data.subscriptions.length} اشتراك`}
          positive
        />
      </div>

      {/* Collapsible sections — live logs */}
      {/* InBody log */}
      <CollapsibleLog
        title="سجل InBody"
        icon={<Activity size={15} className="text-gold" />}
        count={inbodySessions.length}
        expanded={expandedSection === "inbody"}
        onToggle={() => toggle("inbody")}
      >
        {inbodySessions.length === 0 ? (
          <p className="text-center text-muted py-6 text-[13px]">لا توجد جلسات</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-steel">
                <th className="text-right px-4 py-2 text-muted font-normal">العضو</th>
                <th className="text-center px-4 py-2 text-muted font-normal">التاريخ</th>
                <th className="text-center px-4 py-2 text-muted font-normal">النوع</th>
                <th className="text-center px-4 py-2 text-muted font-normal">السعر</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الطريقة</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الموظف</th>
              </tr>
            </thead>
            <tbody>
              {inbodySessions.map((s) => (
                <tr key={s.id} className="border-b border-steel/30 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-white">{s.memberName}</td>
                  <td className="px-4 py-2.5 text-center text-muted">{fmtDate(s.date)} {fmtTime(s.date)}</td>
                  <td className="px-4 py-2.5 text-center text-muted">{s.isGymMember ? "عضو" : "زائر"}</td>
                  <td className="px-4 py-2.5 text-center text-gold font-semibold">{fmtSYP(s.priceSYP)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="bg-green-400/10 text-green-400 text-[10px] px-1.5 py-0.5">{s.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted">{s.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CollapsibleLog>

      {/* Store log */}
      <CollapsibleLog
        title="سجل المتجر"
        icon={<ShoppingBag size={15} className="text-gold" />}
        count={storeSales.length}
        expanded={expandedSection === "store"}
        onToggle={() => toggle("store")}
      >
        {storeSales.length === 0 ? (
          <p className="text-center text-muted py-6 text-[13px]">لا توجد مبيعات</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-steel">
                <th className="text-right px-4 py-2 text-muted font-normal">الوقت</th>
                <th className="text-right px-4 py-2 text-muted font-normal">المنتج</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الكمية</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الإجمالي</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الربح</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الطريقة</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الموظف</th>
              </tr>
            </thead>
            <tbody>
              {storeSales.map((s) => {
                const item = data.storeItems.find((i) => i.id === s.itemId);
                const cost = item ? item.costPriceUSD * s.quantity : 0;
                const profit = s.totalUSD - cost;
                return (
                  <tr key={s.id} className="border-b border-steel/30 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-muted">{fmtDate(s.date)} {fmtTime(s.date)}</td>
                    <td className="px-4 py-2.5 text-white font-medium">{s.itemName}</td>
                    <td className="px-4 py-2.5 text-center text-white">{s.quantity}</td>
                    <td className="px-4 py-2.5 text-center text-gold font-semibold">{fmt(s.totalUSD)}</td>
                    <td className="px-4 py-2.5 text-center text-green-400">{fmt(profit)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="bg-green-400/10 text-green-400 text-[10px] px-1.5 py-0.5">{s.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted">{s.staff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CollapsibleLog>

      {/* Salaries */}
      <CollapsibleLog
        title="الرواتب"
        icon={<DollarSign size={15} className="text-gold" />}
        count={data.salaries.length}
        expanded={expandedSection === "salaries"}
        onToggle={() => toggle("salaries")}
      >
        <SalariesPanel data={data} onSave={(updated) => { saveGymData(updated); setData(loadGymData()); }} />
      </CollapsibleLog>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, positive, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-charcoal border p-4 ${highlight ? "border-gold/40" : "border-steel"}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-muted text-[11px]">{label}</span>
      </div>
      <p className={`font-display text-[20px] ${positive ? "text-white" : "text-danger"} ${highlight ? "text-gold" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-muted text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Collapsible Log ───────────────────────────────────────────────
function CollapsibleLog({ title, icon, count, expanded, onToggle, children }: {
  title: string;
  icon: React.ReactNode;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-charcoal border border-steel">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-white text-[13px] font-semibold">{title}</span>
          <span className="bg-gold/10 text-gold text-[11px] px-2 py-0.5">{count}</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1" title="تحديث مباشر" />
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>
      {expanded && <div className="border-t border-steel overflow-x-auto">{children}</div>}
    </div>
  );
}

// ── Salaries Panel ────────────────────────────────────────────────
function SalariesPanel({ data, onSave }: { data: GymDataStore; onSave: (d: GymDataStore) => void }) {
  const [salaries, setSalaries] = useState(data.salaries);

  function updateSalary(id: string, field: "monthlySalaryUSD" | "paid", val: number | boolean) {
    const updated = salaries.map((s) => s.id === id ? { ...s, [field]: val } : s);
    setSalaries(updated);
    const d = { ...data, salaries: updated };
    onSave(d);
  }

  return (
    <div className="p-4 space-y-3">
      {salaries.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-4 bg-iron border border-steel px-4 py-3">
          <div>
            <p className="text-white text-[13px] font-medium">{s.staffName}</p>
            <p className="text-muted text-[11px]">{s.role}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-muted text-[11px]">$</span>
              <input
                type="number"
                value={s.monthlySalaryUSD}
                onChange={(e) => updateSalary(s.id, "monthlySalaryUSD", parseFloat(e.target.value) || 0)}
                className="w-24 h-8 px-2 bg-void border border-steel text-white text-[13px] text-center focus:border-gold focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-1.5 text-[12px] text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={s.paid}
                onChange={(e) => updateSalary(s.id, "paid", e.target.checked)}
                className="accent-gold"
              />
              مدفوع
            </label>
            {s.paid
              ? <span className="text-green-400 text-[11px]">✓</span>
              : <span className="text-orange-400 text-[11px]">⏳</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}
