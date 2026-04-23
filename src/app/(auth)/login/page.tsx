"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { isPhoneInput, phoneToEmail } from "@/lib/phone";

export default function LoginPage() {
  const [identifier,   setIdentifier]   = useState(""); // username OR phone
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [retryAfter,   setRetryAfter]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (retryAfter <= 0) return;
    timerRef.current = setInterval(() => {
      setRetryAfter((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); setError(""); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryAfter > 0]);

  function startCountdown(seconds: number) {
    clearInterval(timerRef.current!);
    setRetryAfter(seconds);
    setError(`محاولات كثيرة. يرجى الانتظار ${seconds} ثانية.`);
  }

  async function resolveEmail(id: string): Promise<string | null> {
    if (isPhoneInput(id)) {
      // Phone: derive email directly without a round-trip
      return phoneToEmail(id);
    }
    // Username: look up via server
    const res = await fetch(`/api/auth/resolve?username=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.email ?? null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (retryAfter > 0) return;
    setError("");

    const id = identifier.trim();
    if (!id)       { setError("يرجى إدخال اسم المستخدم أو رقم الهاتف"); return; }
    if (!password) { setError("يرجى إدخال كلمة المرور"); return; }

    setLoading(true);

    const email = await resolveEmail(id);
    if (!email) {
      setError("اسم المستخدم أو رقم الهاتف غير موجود");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      const status = (authError as { status?: number }).status;
      if (status === 429) {
        startCountdown(60);
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    // Get role
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: authData.user.id }),
    });

    if (res.status === 429) {
      const retryHeader = res.headers.get("Retry-After");
      startCountdown(retryHeader ? parseInt(retryHeader, 10) : 60);
      setLoading(false);
      return;
    }

    const result = await res.json();
    const role   = result?.data?.role ?? "player";
    const homes: Record<string, string> = {
      manager:   "/dashboard",
      coach:     "/coach",
      reception: "/reception",
      player:    "/portal",
    };
    window.location.href = homes[role] ?? "/portal";
  }

  return (
    <div className="p-7 sm:p-8" dir="rtl">
      <h2 className="font-display text-[30px] tracking-[0.04em] text-white leading-none mb-1">
        تسجيل الدخول
      </h2>
      <p className="text-[13px] text-muted mb-8">
        أدخل اسم المستخدم أو رقم هاتفك وكلمة المرور
      </p>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3 flex items-center justify-between gap-3">
            <span>{error}</span>
            {retryAfter > 0 && (
              <span className="font-mono text-[12px] bg-danger/20 px-2 py-0.5 rounded tabular-nums flex-shrink-0">
                {retryAfter}s
              </span>
            )}
          </div>
        )}

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            اسم المستخدم أو رقم الهاتف
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="0912345678 أو ahmed_khalil"
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
              placeholder="••••••••"
              dir="ltr"
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
          <Button type="submit" fullWidth loading={loading} disabled={retryAfter > 0}>
            {retryAfter > 0 ? `انتظر ${retryAfter}s` : "دخول"}
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
