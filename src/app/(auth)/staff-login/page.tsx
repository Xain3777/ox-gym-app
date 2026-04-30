"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { getStaffEmail, type StaffAccount } from "@/lib/staff";

export default function StaffLoginPage() {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/staff")
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res?.success) setStaffList(res.data as StaffAccount[]);
      })
      .catch(() => { /* leave list empty; UI shows the empty state */ })
      .finally(() => { if (!cancelled) setStaffLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const staff = staffList.find((s) => s.id === selectedId);
    if (!staff) {
      setError("يرجى اختيار موظف");
      return;
    }
    if (!pin) {
      setError("يرجى إدخال رمز الدخول");
      return;
    }

    setLoading(true);

    const email = getStaffEmail(staff.phone);
    const supabase = createBrowserSupabase();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password: pin });

    if (!authError && authData.user) {
      const roleHomes: Record<string, string> = {
        manager: "/dashboard",
        reception: "/reception",
      };
      window.location.href = roleHomes[staff.role] ?? "/reception";
      return;
    }

    setError("رمز الدخول غير صحيح");
    setLoading(false);
  }

  return (
    <div className="p-7 sm:p-8" dir="rtl">
      <h2 className="font-display text-[30px] tracking-[0.04em] text-white leading-none mb-1">
        دخول الموظفين
      </h2>
      <p className="text-[13px] text-muted mb-8">
        نظام إدارة عمليات النادي
      </p>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            الموظف
          </label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={staffLoading}
              className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] focus:border-gold focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>
                {staffLoading
                  ? "جاري التحميل…"
                  : staffList.length === 0
                    ? "لا يوجد موظفون"
                    : "— اختر —"}
              </option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.title}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[10px]">
              ▼
            </span>
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            رمز الدخول
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            maxLength={8}
            className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors tracking-[0.3em] text-center"
            placeholder="••••"
          />
          <p className="text-[11px] text-muted/50 mt-1.5 text-center">
            رمز الدخول التدريبي: 1234
          </p>
        </div>

        <div className="pt-2">
          <Button type="submit" fullWidth loading={loading}>
            تسجيل الدخول
          </Button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
        <Link href="/login" className="text-[12px] text-white/30 hover:text-white/50 transition-colors">
          ← العودة لتسجيل دخول الأعضاء
        </Link>
      </div>
    </div>
  );
}
