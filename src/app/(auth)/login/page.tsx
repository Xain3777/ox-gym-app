"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      setError("يرجى إدخال رقم الهاتف");
      return;
    }
    if (!password) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);

    const email = `${digits}@member.oxgym.app`;
    const supabase = createBrowserSupabase();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError("رقم الهاتف أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    // Get role to redirect correctly
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: authData.user.id }),
    });
    const result = await res.json();
    const role = result?.data?.role ?? "player";

    const roleHomes: Record<string, string> = {
      manager: "/dashboard",
      coach: "/coach",
      reception: "/reception",
      player: "/portal",
    };

    window.location.href = roleHomes[role] ?? "/portal";
  }

  return (
    <div className="p-7 sm:p-8" dir="rtl">
      <h2 className="font-display text-[30px] tracking-[0.04em] text-white leading-none mb-1">
        تسجيل الدخول
      </h2>
      <p className="text-[13px] text-muted mb-8">
        أدخل رقم هاتفك وكلمة المرور للدخول
      </p>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            رقم الهاتف
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="+964 7XX XXX XXXX"
            dir="ltr"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-12 px-4 pr-12 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? "◉" : "◎"}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <Button type="submit" fullWidth loading={loading}>
            دخول
          </Button>
        </div>
      </form>

      <p className="text-[13px] text-muted mt-6 text-center">
        ليس لديك حساب؟{" "}
        <Link href="/signup" className="text-gold hover:text-gold-high transition-colors">
          إنشاء حساب جديد
        </Link>
      </p>

      <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
        <Link href="/staff-login" className="text-[11px] text-white/20 hover:text-white/40 transition-colors">
          دخول الموظفين
        </Link>
      </div>
    </div>
  );
}
