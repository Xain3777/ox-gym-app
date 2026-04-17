"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity, UserCheck, UserX, ChevronDown, Plus, Trash2,
} from "lucide-react";
import {
  loadGymData, saveGymData, generateId, subscribeToGymData,
  INBODY_PRICE_MEMBER_SYP, INBODY_PRICE_NONMEMBER_SYP, USD_TO_SYP_RATE,
  type InBodySession, type PaymentMethod, type Currency, type GymDataStore,
} from "@/lib/gymData";

const PAYMENT_METHODS: PaymentMethod[] = ["نقدي", "بطاقة", "تحويل"];

function formatSYP(n: number) {
  return n.toLocaleString("ar-SY") + " ل.س";
}
function formatUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SY", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" });
}

export default function ReceptionInBodyPage() {
  const [data, setData] = useState<GymDataStore | null>(null);
  const [memberName, setMemberName] = useState("");
  const [isGymMember, setIsGymMember] = useState(true);
  const [currency, setCurrency] = useState<Currency>("SYP");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("نقدي");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const reload = useCallback(() => setData(loadGymData()), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    return subscribeToGymData((d) => setData(d));
  }, []);

  const priceSYP = isGymMember ? INBODY_PRICE_MEMBER_SYP : INBODY_PRICE_NONMEMBER_SYP;
  const priceUSD = Math.round((priceSYP / USD_TO_SYP_RATE) * 100) / 100;

  const todaySessions = (data?.inbodySessions ?? []).filter(
    (s) => new Date(s.date).toDateString() === new Date().toDateString()
  );
  const todayTotal = todaySessions.reduce((sum, s) => sum + s.priceSYP, 0);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!memberName.trim()) return;
    setSaving(true);
    const d = loadGymData();
    const session: InBodySession = {
      id: generateId(),
      date: new Date().toISOString(),
      memberName: memberName.trim(),
      isGymMember,
      priceSYP,
      priceUSD,
      currency,
      paymentMethod,
      staff: "محمد",
      notes: notes.trim() || undefined,
    };
    d.inbodySessions = [session, ...d.inbodySessions];
    saveGymData(d);
    setData(d);
    setMemberName("");
    setNotes("");
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  function handleDelete(id: string) {
    const d = loadGymData();
    d.inbodySessions = d.inbodySessions.filter((s) => s.id !== id);
    saveGymData(d);
    setData(d);
  }

  return (
    <div className="p-5 pb-24 md:pb-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={22} className="text-gold" />
          <h1 className="font-display text-[26px] tracking-wider text-white">جهاز InBody</h1>
        </div>
        <div className="flex items-center gap-2 bg-charcoal border border-steel px-3 py-1.5">
          <Activity size={14} className="text-gold" />
          <span className="text-[12px] text-muted font-mono">INBODY جهاز</span>
          <span className="bg-gold/20 text-gold text-[11px] font-bold px-2 py-0.5">
            {todaySessions.length} جلسة
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div>
        <p className="text-[11px] text-muted/60 font-mono uppercase tracking-widest mb-3 text-left">الأسعار</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-charcoal border border-steel p-4 text-center">
            <p className="text-muted text-[11px] mb-2">باقة 10 جلسات</p>
            <p className="text-gold font-display text-[22px]">
              {formatSYP(INBODY_PRICE_MEMBER_SYP * 10 * 0.85)}
            </p>
            <p className="text-muted text-[10px] mt-1">{formatSYP(INBODY_PRICE_MEMBER_SYP * 0.85)}/جلسة</p>
          </div>
          <div className="bg-charcoal border border-steel p-4 text-center">
            <p className="text-muted text-[11px] mb-2">باقة 5 جلسات</p>
            <p className="text-gold font-display text-[22px]">
              {formatSYP(INBODY_PRICE_MEMBER_SYP * 5 * 0.90)}
            </p>
            <p className="text-muted text-[10px] mt-1">{formatSYP(INBODY_PRICE_MEMBER_SYP * 0.90)}/جلسة</p>
          </div>
          <div className="bg-gold/10 border border-gold p-4 text-center">
            <p className="text-muted text-[11px] mb-2">جلسة واحدة</p>
            <p className="text-gold font-display text-[22px]">{formatSYP(INBODY_PRICE_MEMBER_SYP)}</p>
            <p className="text-muted text-[10px] mt-1">للأعضاء المشتركين</p>
          </div>
        </div>
        <p className="text-[11px] text-muted/60 mt-2 text-center">
          للزوار غير المشتركين: {formatSYP(INBODY_PRICE_NONMEMBER_SYP)} / جلسة
          &nbsp;·&nbsp; سعر الصرف: 1$ = {USD_TO_SYP_RATE.toLocaleString()} ل.س
        </p>
      </div>

      {/* Today's Sessions */}
      <div className="bg-charcoal border border-steel">
        <div className="flex items-center justify-between px-4 py-3 border-b border-steel">
          <span className="text-white text-[13px] font-semibold">جلسات اليوم</span>
          <span className="text-muted text-[12px]">{todaySessions.length} جلسة</span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="py-10 text-center text-muted text-[13px]">لا توجد جلسات اليوم بعد</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-steel">
                <th className="text-right px-4 py-2 text-muted font-normal">العضو</th>
                <th className="text-center px-4 py-2 text-muted font-normal">النوع</th>
                <th className="text-center px-4 py-2 text-muted font-normal">السعر</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الطريقة</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الوقت</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {todaySessions.map((s) => (
                <tr key={s.id} className="border-b border-steel/40 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">{s.memberName}</td>
                  <td className="px-4 py-3 text-center">
                    {s.isGymMember
                      ? <span className="flex items-center justify-center gap-1 text-green-400"><UserCheck size={13}/> عضو</span>
                      : <span className="flex items-center justify-center gap-1 text-orange-400"><UserX size={13}/> زائر</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center text-gold font-semibold">
                    {s.currency === "SYP" ? formatSYP(s.priceSYP) : formatUSD(s.priceUSD)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-green-400/10 text-green-400 text-[11px] px-2 py-0.5 font-semibold">
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-muted">{formatTime(s.date)}</td>
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => handleDelete(s.id)} className="text-muted hover:text-danger transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="px-4 py-2 border-t border-steel flex items-center justify-between">
          <span className="text-muted text-[12px]">إجمالي اليوم</span>
          <span className="text-gold font-bold text-[14px]">{formatSYP(todayTotal)}</span>
        </div>
      </div>

      {/* Add New Session Form */}
      <div className="bg-charcoal border border-gold/30">
        <div className="px-4 py-3 border-b border-steel flex items-center gap-2">
          <Plus size={14} className="text-gold" />
          <span className="text-white text-[13px] font-semibold">تسجيل جلسة جديدة</span>
        </div>

        {success && (
          <div className="mx-4 mt-3 bg-green-400/10 border border-green-400/30 text-green-400 text-[13px] px-4 py-2">
            ✓ تم تسجيل الجلسة بنجاح
          </div>
        )}

        <form onSubmit={handleAdd} className="p-4 space-y-4">
          {/* Member Name */}
          <div>
            <label className="text-muted text-[11px] font-mono uppercase tracking-wider block mb-1.5">العضو</label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="اسم العضو أو الزائر"
              required
              className="w-full h-10 px-3 bg-iron border border-steel text-white text-[13px] placeholder:text-muted/40 focus:border-gold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Member Type */}
            <div>
              <label className="text-muted text-[11px] font-mono uppercase tracking-wider block mb-1.5">نوع العضو</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsGymMember(true)}
                  className={`flex-1 h-10 text-[12px] font-semibold border transition-colors ${
                    isGymMember ? "bg-gold text-void border-gold" : "bg-iron border-steel text-muted hover:text-white"
                  }`}
                >
                  عضو
                </button>
                <button
                  type="button"
                  onClick={() => setIsGymMember(false)}
                  className={`flex-1 h-10 text-[12px] font-semibold border transition-colors ${
                    !isGymMember ? "bg-orange-500 text-white border-orange-500" : "bg-iron border-steel text-muted hover:text-white"
                  }`}
                >
                  زائر
                </button>
              </div>
            </div>

            {/* Payment Method */}
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

            {/* Currency */}
            <div>
              <label className="text-muted text-[11px] font-mono uppercase tracking-wider block mb-1.5">العملة</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCurrency("SYP")}
                  className={`flex-1 h-10 text-[12px] font-semibold border transition-colors ${currency === "SYP" ? "bg-gold text-void border-gold" : "bg-iron border-steel text-muted hover:text-white"}`}>
                  ل.س
                </button>
                <button type="button" onClick={() => setCurrency("USD")}
                  className={`flex-1 h-10 text-[12px] font-semibold border transition-colors ${currency === "USD" ? "bg-gold text-void border-gold" : "bg-iron border-steel text-muted hover:text-white"}`}>
                  $
                </button>
              </div>
            </div>
          </div>

          {/* Price display */}
          <div className="bg-iron border border-steel px-4 py-2 flex items-center justify-between">
            <span className="text-muted text-[12px]">السعر</span>
            <span className="text-gold font-bold text-[16px]">
              {currency === "SYP" ? formatSYP(priceSYP) : formatUSD(priceUSD)}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="text-muted text-[11px] font-mono uppercase tracking-wider block mb-1.5">ملاحظات (اختياري)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات..."
              className="w-full h-10 px-3 bg-iron border border-steel text-white text-[13px] placeholder:text-muted/40 focus:border-gold focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !memberName.trim()}
            className="w-full h-11 bg-gold text-void font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            <Activity size={15} />
            {saving ? "جاري الحفظ..." : "تسجيل جلسة"}
          </button>
        </form>
      </div>

      {/* Full History */}
      {(data?.inbodySessions.length ?? 0) > todaySessions.length && (
        <div className="bg-charcoal border border-steel">
          <div className="px-4 py-3 border-b border-steel">
            <span className="text-white text-[13px] font-semibold">السجل الكامل</span>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-steel">
                <th className="text-right px-4 py-2 text-muted font-normal">العضو</th>
                <th className="text-center px-4 py-2 text-muted font-normal">التاريخ</th>
                <th className="text-center px-4 py-2 text-muted font-normal">السعر</th>
                <th className="text-center px-4 py-2 text-muted font-normal">الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {(data?.inbodySessions ?? []).slice(todaySessions.length).map((s) => (
                <tr key={s.id} className="border-b border-steel/30 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-white">{s.memberName}</td>
                  <td className="px-4 py-2.5 text-center text-muted">{formatDate(s.date)}</td>
                  <td className="px-4 py-2.5 text-center text-gold">{formatSYP(s.priceSYP)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="bg-green-400/10 text-green-400 text-[10px] px-1.5 py-0.5">{s.paymentMethod}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
