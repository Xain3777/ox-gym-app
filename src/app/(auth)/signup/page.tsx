"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { phoneToEmail } from "@/lib/phone";

export default function SignupPage() {
  const [username,     setUsername]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, phone, password }),
    });

    const result = await res.json();

    if (!result.success) {
      setError(result.error ?? "Signup failed");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.href = "/onboarding";
  }

  return (
    <div className="p-6">
      <h2 className="font-display text-[28px] tracking-[0.04em] text-white leading-none mb-1">
        إنشاء حساب
      </h2>
      <p className="text-[13px] text-muted mb-6">
        انضم إلى OX GYM وابدأ رحلتك الرياضية.
      </p>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3">
            {error}
          </div>
        )}

        {/* Username */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
            اسم المستخدم
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full h-11 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="ahmed_khalil"
            dir="ltr"
          />
          <p className="text-white/30 text-[11px] mt-1">حروف وأرقام وشرطة سفلية فقط</p>
        </div>

        {/* Phone */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
            رقم الهاتف
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            className="w-full h-11 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="0912345678"
            dir="ltr"
          />
          <p className="text-white/30 text-[11px] mt-1">مثال: 0912345678 أو +963912345678</p>
        </div>

        {/* Password */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full h-11 px-4 pr-12 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
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
          <p className="text-white/30 text-[11px] mt-1">8 أحرف على الأقل، حرف كبير ورقم</p>
        </div>

        <Button type="submit" fullWidth loading={loading}>
          إنشاء حساب
        </Button>
      </form>

      <p className="text-[13px] text-muted mt-6 text-center">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="text-gold hover:text-gold-high transition-colors">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
