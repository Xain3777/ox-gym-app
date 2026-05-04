"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

// Staff login by free-text identifier (name | username | phone) +
// password. The dropdown picker was replaced because every coach,
// reception, and head_coach now needs to land here, and a flat list
// scales badly.
//
// Resolution flow:
//   1. POST /api/auth/resolve-staff { identifier } → { email, role }
//   2. supabase.auth.signInWithPassword({ email, password })
//   3. Hard-navigate to that role's home so middleware sees the
//      freshly-set session cookies.

const ROLE_HOMES: Record<string, string> = {
  manager:    "/dashboard",
  reception:  "/reception",
  head_coach: "/coach",
  coach:      "/coach",
};

export default function StaffLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const id = identifier.trim();
    if (!id) { setError("يرجى إدخال الاسم أو رقم الهاتف"); return; }
    if (!password) { setError("يرجى إدخال كلمة المرور"); return; }

    setLoading(true);

    // Resolve identifier → auth email
    const resolveRes = await fetch("/api/auth/resolve-staff", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ identifier: id }),
    });
    const resolved = await resolveRes.json();

    if (!resolveRes.ok || !resolved?.success) {
      setError(resolved?.error ?? "لم يتم العثور على الحساب");
      setLoading(false);
      return;
    }

    // Authenticate
    const supabase = createBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    resolved.email,
      password,
    });

    if (authError) {
      setError("كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    const home = ROLE_HOMES[resolved.role as string] ?? "/reception";
    window.location.href = home;
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

        {/* Identifier — name OR phone OR username */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            الاسم أو رقم الهاتف
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            spellCheck={false}
            className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="مثال: محمد أو 0922000001"
            dir="rtl"
          />
        </div>

        {/* Password */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            كلمة المرور
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={64}
            autoComplete="current-password"
            className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors tracking-[0.15em] text-center"
            placeholder="••••••••"
            dir="ltr"
          />
          <p className="text-[11px] text-muted/50 mt-1.5 text-center">
            استخدم كلمة المرور المؤقتة الخاصة بك
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
