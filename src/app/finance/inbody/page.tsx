"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Trash2 } from "lucide-react";
import {
  loadGymData, saveGymData, subscribeToGymData,
  INBODY_PRICE_MEMBER_SYP, INBODY_PRICE_NONMEMBER_SYP,
  type GymDataStore,
} from "@/lib/gymData";

function fmtSYP(n: number) { return n.toLocaleString("ar-SY") + " ل.س"; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SY", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" });
}

export default function FinanceInBodyPage() {
  const [data, setData] = useState<GymDataStore | null>(null);

  const reload = useCallback(() => setData(loadGymData()), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { return subscribeToGymData((d) => setData(d)); }, []);

  const sessions = data?.inbodySessions ?? [];
  const totalSYP = sessions.reduce((s, x) => s + x.priceSYP, 0);
  const memberCount = sessions.filter((s) => s.isGymMember).length;
  const visitorCount = sessions.filter((s) => !s.isGymMember).length;

  function handleDelete(id: string) {
    const d = loadGymData();
    d.inbodySessions = d.inbodySessions.filter((s) => s.id !== id);
    saveGymData(d);
    setData(loadGymData());
  }

  return (
    <div className="p-5 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Activity size={22} className="text-gold" />
        <h1 className="font-display text-[26px] tracking-wider text-white">سجل InBody</h1>
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="تحديث مباشر" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "إجمالي الجلسات", value: sessions.length },
          { label: "أعضاء",          value: memberCount },
          { label: "زوار",           value: visitorCount },
          { label: "الإيراد الكلي",  value: fmtSYP(totalSYP) },
        ].map((c) => (
          <div key={c.label} className="bg-charcoal border border-steel p-3 text-center">
            <p className="text-gold font-display text-[18px]">{c.value}</p>
            <p className="text-muted text-[10px] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Price reference */}
      <div className="bg-charcoal border border-steel px-4 py-3 flex gap-6 text-[12px]">
        <span className="text-muted">سعر العضو: <strong className="text-gold">{fmtSYP(INBODY_PRICE_MEMBER_SYP)}</strong></span>
        <span className="text-muted">سعر الزائر: <strong className="text-gold">{fmtSYP(INBODY_PRICE_NONMEMBER_SYP)}</strong></span>
      </div>

      {/* Full log table */}
      <div className="bg-charcoal border border-steel overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-steel">
              <th className="text-right px-4 py-2.5 text-muted font-normal">العضو</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">التاريخ</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الوقت</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">النوع</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">السعر</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الطريقة</th>
              <th className="text-center px-4 py-2.5 text-muted font-normal">الموظف</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-muted">لا توجد جلسات مسجّلة</td></tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-steel/30 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-white font-medium">{s.memberName}</td>
                  <td className="px-4 py-2.5 text-center text-muted">{fmtDate(s.date)}</td>
                  <td className="px-4 py-2.5 text-center text-muted">{fmtTime(s.date)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 ${s.isGymMember ? "bg-green-400/10 text-green-400" : "bg-orange-400/10 text-orange-400"}`}>
                      {s.isGymMember ? "عضو" : "زائر"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gold font-semibold">{fmtSYP(s.priceSYP)}</td>
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
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-steel flex justify-between">
          <span className="text-muted text-[12px]">الإجمالي</span>
          <span className="text-gold font-bold">{fmtSYP(totalSYP)}</span>
        </div>
      </div>
    </div>
  );
}
