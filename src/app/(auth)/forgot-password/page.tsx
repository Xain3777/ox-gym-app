"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [phone, setPhone]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setError("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? "حدث خطأ، يرجى المحاولة مرة أخرى");
      } else {
        setSent(true);
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-4xl font-black text-[#F5C100] tracking-[6px]">OX GYM</div>
          <div className="text-[10px] text-[#555] tracking-[3px] uppercase mt-1">
            HARDER · BETTER · FASTER · STRONGER
          </div>
        </div>

        <div className="bg-[#111] border border-[#1E1E1E] p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <h2 className="text-xl font-bold text-white">تم إرسال رابط الاسترداد</h2>
              <p className="text-[#888] text-sm leading-relaxed">
                إذا كان رقم هاتفك مسجلاً لدينا، ستصل رسالة بريد إلكتروني تحتوي على رابط إعادة تعيين كلمة المرور.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 text-[#F5C100] text-sm hover:underline"
              >
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2">استعادة كلمة المرور</h2>
              <p className="text-[#888] text-sm mb-6">
                أدخل رقم هاتفك وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
              </p>

              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#888] uppercase tracking-widest mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    required
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white px-4 py-3 text-sm
                               focus:outline-none focus:border-[#F5C100] transition-colors"
                    dir="ltr"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F5C100] text-black font-bold py-3 tracking-widest
                             uppercase text-sm hover:bg-[#e6b400] transition-colors disabled:opacity-50"
                >
                  {loading ? "جاري الإرسال..." : "إرسال رابط الاسترداد"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-[#888] text-sm hover:text-[#F5C100] transition-colors">
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
