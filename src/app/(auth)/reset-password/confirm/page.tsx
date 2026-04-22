"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

type Phase = "loading" | "form" | "success" | "error";

export default function ResetPasswordConfirmPage() {
  const router  = useRouter();
  const [phase,        setPhase]        = useState<Phase>("loading");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  // Supabase puts the recovery tokens in the URL hash on redirect.
  // We exchange them for a live session, then show the new-password form.
  useEffect(() => {
    const hash   = window.location.hash.slice(1);               // strip leading #
    const params = new URLSearchParams(hash);
    const type   = params.get("type");
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (type !== "recovery" || !accessToken || !refreshToken) {
      setPhase("error");
      return;
    }

    const supabase = createBrowserSupabase();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) { setPhase("error"); }
        else        { setPhase("form"); }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message ?? "حدث خطأ. يرجى المحاولة مرة أخرى.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setPhase("success");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-4xl font-black text-[#F5C100] tracking-[6px]">OX GYM</div>
          <div className="text-[10px] text-[#555] tracking-[3px] uppercase mt-1">
            HARDER · BETTER · FASTER · STRONGER
          </div>
        </div>

        <div className="bg-[#111] border border-[#1E1E1E] p-8">

          {/* ── LOADING ── */}
          {phase === "loading" && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-[#F5C100] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#888] text-sm">جاري التحقق من الرابط...</p>
            </div>
          )}

          {/* ── INVALID LINK ── */}
          {phase === "error" && (
            <div className="text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <h2 className="text-xl font-bold text-white">رابط غير صالح</h2>
              <p className="text-[#888] text-sm leading-relaxed">
                رابط إعادة التعيين منتهي الصلاحية أو تم استخدامه مسبقاً.
                يرجى طلب رابط جديد.
              </p>
              <button
                onClick={() => router.push("/forgot-password")}
                className="inline-block mt-2 text-[#F5C100] text-sm hover:underline"
              >
                طلب رابط جديد
              </button>
            </div>
          )}

          {/* ── NEW PASSWORD FORM ── */}
          {phase === "form" && (
            <>
              <h2 className="text-xl font-bold text-white mb-2">تعيين كلمة مرور جديدة</h2>
              <p className="text-[#888] text-sm mb-6">اختر كلمة مرور قوية لحسابك.</p>

              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#888] uppercase tracking-widest mb-2">
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-4 py-3 pr-12 text-sm
                                 focus:outline-none focus:border-[#F5C100] transition-colors"
                      placeholder="8 أحرف على الأقل"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                    >
                      {showPassword ? "◉" : "◎"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#888] uppercase tracking-widest mb-2">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-4 py-3 text-sm
                               focus:outline-none focus:border-[#F5C100] transition-colors"
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                >
                  حفظ كلمة المرور
                </Button>
              </form>
            </>
          )}

          {/* ── SUCCESS ── */}
          {phase === "success" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#F5C100]/10 border border-[#F5C100]/30 flex items-center justify-center mx-auto">
                <span className="text-[#F5C100] text-2xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-white">تم تغيير كلمة المرور</h2>
              <p className="text-[#888] text-sm">
                يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="inline-block mt-2 bg-[#F5C100] text-black font-bold px-6 py-3 text-sm
                           tracking-widest uppercase hover:bg-[#e6b400] transition-colors"
              >
                تسجيل الدخول
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
