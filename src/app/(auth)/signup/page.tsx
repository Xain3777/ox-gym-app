"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { cn } from "@/lib/utils";

// Self-signup is keyed on phone number — the same phone the dashboard
// uses when reception adds a member. If a matching member already
// exists we link the auth user to that row instead of creating a new
// one (so the subscription set up at the desk follows the member into
// the app).

type Step = 0 | 1 | 2;
const TOTAL = 3;

export default function SignupPage() {
  const [step, setStep]         = useState<Step>(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function next() {
    setError("");
    if (step === 0) {
      const n = fullName.trim();
      if (n.length < 2)  { setError("الاسم يجب أن يكون حرفين على الأقل"); return; }
      if (n.length > 100) { setError("الاسم طويل جداً"); return; }
      setStep(1);
      return;
    }
    if (step === 1) {
      const digits = normalizePhone(phone);
      if (digits.length < 7)  { setError("رقم الهاتف غير صالح"); return; }
      if (digits.length > 15) { setError("رقم الهاتف طويل جداً"); return; }
      setStep(2);
      return;
    }
    submit();
  }

  function back() {
    setError("");
    if (step === 0) return;
    setStep((step - 1) as Step);
  }

  async function submit() {
    if (!password) { setError("أدخل كلمة المرور"); return; }
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        full_name: fullName.trim(),
        phone:     phone.trim(),
        password,
      }),
    });
    const result = await res.json();

    if (!result.success) {
      setError(result.error ?? "تعذّر إنشاء الحساب");
      setLoading(false);
      return;
    }

    // The signup route returns the email it bound to auth.users. Use it
    // to set the session cookies — works whether the row was newly
    // created or linked to an existing dashboard member.
    const email = result.data?.email ?? phoneToEmail(phone);

    const supabase = createBrowserSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("تم إنشاء الحساب، لكن تعذّر تسجيل الدخول. حاول الدخول يدوياً.");
      setLoading(false);
      return;
    }

    // Hard navigate so middleware sees the freshly-set session cookies.
    // Linked dashboard members still need the Web App profile screen because
    // reception data is not the same thing as app onboarding data.
    window.location.href = result.data?.linked ? "/portal/profile" : "/onboarding";
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={back}
          disabled={step === 0}
          className={cn(
            "w-9 h-9 flex items-center justify-center text-white/80 transition-opacity",
            step === 0 && "opacity-0 pointer-events-none",
          )}
          aria-label="رجوع"
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
          <NameStep value={fullName} onChange={setFullName} />
        )}
        {step === 1 && (
          <PhoneStep value={phone} onChange={setPhone} />
        )}
        {step === 2 && (
          <PasswordStep value={password} onChange={setPassword} show={showPass} toggleShow={() => setShowPass((v) => !v)} />
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

function NameStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h1 className="font-display text-[26px] leading-tight text-white mb-2">ما اسمك؟</h1>
      <p className="text-[13px] text-muted mb-8">سنستخدمه لمناداتك في التطبيق.</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        autoComplete="name"
        spellCheck={false}
        className="w-full h-14 px-4 bg-iron border border-steel text-offwhite text-[18px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
        placeholder="أحمد خليل"
      />
    </div>
  );
}

function PhoneStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h1 className="font-display text-[26px] leading-tight text-white mb-2">رقم الهاتف</h1>
      <p className="text-[13px] text-muted mb-8">
        إذا كان رقمك مسجّلاً عند الاستقبال، سنربط حسابك بالاشتراك تلقائياً.
      </p>
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        autoComplete="tel"
        spellCheck={false}
        className="w-full h-14 px-4 bg-iron border border-steel text-offwhite text-[18px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
        placeholder="0912345678"
        dir="ltr"
      />
    </div>
  );
}

function PasswordStep({
  value,
  onChange,
  show,
  toggleShow,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggleShow: () => void;
}) {
  return (
    <div>
      <h1 className="font-display text-[26px] leading-tight text-white mb-8">أنشئ كلمة مرور</h1>
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
          aria-label={show ? "إخفاء" : "إظهار"}
        >
          {show ? "◉" : "◎"}
        </button>
      </div>
    </div>
  );
}
