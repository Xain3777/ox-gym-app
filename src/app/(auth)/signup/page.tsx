"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { phoneToEmail, normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;
const TOTAL = 4;

export default function SignupPage() {
  const [step, setStep] = useState<Step>(0);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  function next() {
    setError("");
    if (step === 0 && !firstName.trim())      { setError("أدخل اسمك الأول"); return; }
    if (step === 1 && !lastName.trim())       { setError("أدخل الكنية"); return; }
    if (step === 2) {
      const p = normalizePhone(phone);
      if (!/^963\d{9}$/.test(p))              { setError("رقم الهاتف غير صالح"); return; }
    }
    if (step === 3) { submit(); return; }
    setStep((s) => (s + 1) as Step);
  }

  function back() {
    setError("");
    if (step === 0) return;
    setStep((s) => (s - 1) as Step);
  }

  async function submit() {
    if (password.length < 8)                       { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (!/[A-Z]/.test(password))                   { setError("كلمة المرور يجب أن تحتوي على حرف كبير"); return; }
    if (!/[0-9]/.test(password))                   { setError("كلمة المرور يجب أن تحتوي على رقم"); return; }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, phone, password }),
    });
    const result = await res.json();

    if (!result.success) {
      setError(result.error ?? "تعذّر إنشاء الحساب");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });

    if (signInError) {
      setError("تم إنشاء الحساب، لكن تعذّر تسجيل الدخول. حاول الدخول يدوياً.");
      setLoading(false);
      return;
    }

    window.location.href = "/onboarding";
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6" dir="rtl">
      {/* Top bar: back + title */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={back}
          disabled={step === 0}
          className={cn(
            "w-9 h-9 flex items-center justify-center text-white/80 transition-opacity",
            step === 0 && "opacity-0 pointer-events-none",
          )}
          aria-label="back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l-7 7 7 7" transform="scale(-1,1) translate(-24,0)" />
          </svg>
        </button>
        <h2 className="font-display text-[18px] tracking-wide text-white">إنشاء حساب</h2>
        <div className="w-9" />
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-10">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-[3px] rounded-full transition-colors",
              i <= step ? "bg-gold" : "bg-white/10",
            )}
          />
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col">
        {step === 0 && (
          <Step
            title="ما هو اسمك الأول؟"
            value={firstName}
            onChange={setFirstName}
            placeholder="أحمد"
            autoComplete="given-name"
          />
        )}
        {step === 1 && (
          <Step
            title="ما هي الكنية؟"
            value={lastName}
            onChange={setLastName}
            placeholder="خليل"
            autoComplete="family-name"
          />
        )}
        {step === 2 && (
          <Step
            title="ما هو رقم هاتفك؟"
            value={phone}
            onChange={setPhone}
            placeholder="0912345678"
            type="tel"
            autoComplete="tel"
            ltr
          />
        )}
        {step === 3 && (
          <PasswordStep
            title="أنشئ كلمة مرور"
            value={password}
            onChange={setPassword}
            show={showPass}
            toggleShow={() => setShowPass((v) => !v)}
          />
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3 mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-6 space-y-3">
        <Button type="button" fullWidth loading={loading} onClick={next}>
          {step === TOTAL - 1 ? "إنشاء الحساب" : "متابعة"}
        </Button>
        {step === 0 && (
          <p className="text-[13px] text-muted text-center">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-gold hover:text-gold-high transition-colors">
              تسجيل الدخول
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Single-field step ──────────────────────────────────────────
function Step({
  title,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  ltr = false,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <h1 className="font-display text-[26px] leading-tight text-white mb-8">{title}</h1>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        autoComplete={autoComplete}
        className="w-full h-14 px-4 bg-iron border border-steel text-offwhite text-[18px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
      />
    </div>
  );
}

// ── Password step ──────────────────────────────────────────────
function PasswordStep({
  title,
  value,
  onChange,
  show,
  toggleShow,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggleShow: () => void;
}) {
  return (
    <div>
      <h1 className="font-display text-[26px] leading-tight text-white mb-2">{title}</h1>
      <p className="text-[13px] text-muted mb-8">8 أحرف على الأقل، حرف كبير ورقم</p>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          autoComplete="new-password"
          className="w-full h-14 px-4 pl-12 bg-iron border border-steel text-offwhite text-[18px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
          placeholder="••••••••"
          dir="ltr"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
        >
          {show ? "◉" : "◎"}
        </button>
      </div>
    </div>
  );
}
