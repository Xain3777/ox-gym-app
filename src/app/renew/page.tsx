"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Subscription {
  plan_type: string;
  end_date: string;
  status: string;
}

interface Profile {
  full_name: string;
  email: string;
  subscription: Subscription | null;
}

const PLAN_PRICES: Record<string, { label: string; price: number }> = {
  monthly:   { label: "شهري",   price: 250 },
  quarterly: { label: "ربع سنوي", price: 650 },
  annual:    { label: "سنوي",   price: 2200 },
};

export default function RenewPage() {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string>("monthly");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/portal/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setProfile(json.data);
          if (json.data.subscription?.plan_type) {
            setSelected(json.data.subscription.plan_type);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#F5C100] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold text-white">تم استلام طلبك</h2>
          <p className="text-[#888] leading-relaxed">
            سيتواصل معك فريق OX GYM خلال 24 ساعة لتأكيد تجديد اشتراكك.
          </p>
          <Link
            href="/portal"
            className="inline-block mt-4 bg-[#F5C100] text-black font-bold px-8 py-3
                       uppercase tracking-widest text-sm hover:bg-[#e6b400] transition-colors"
          >
            العودة للبوابة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-[#F5C100] tracking-[6px]">OX GYM</div>
          <div className="text-[10px] text-[#555] tracking-[3px] uppercase mt-1">
            HARDER · BETTER · FASTER · STRONGER
          </div>
        </div>

        <div className="bg-[#111] border border-[#1E1E1E] p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">تجديد الاشتراك</h1>
            {profile && (
              <p className="text-[#888] text-sm mt-1">
                مرحباً {profile.full_name} — اختر الخطة التي تناسبك
              </p>
            )}
          </div>

          {/* Current status */}
          {profile?.subscription && (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] px-4 py-3 text-sm">
              <span className="text-[#888]">اشتراكك الحالي: </span>
              <span className="text-[#F5C100] font-semibold">
                {PLAN_PRICES[profile.subscription.plan_type]?.label ?? profile.subscription.plan_type}
              </span>
              <span className="text-[#888] mx-2">—</span>
              <span className="text-[#888]">
                ينتهي: {new Date(profile.subscription.end_date).toLocaleDateString("ar-SA")}
              </span>
            </div>
          )}

          {/* Plan selector */}
          <div className="space-y-3">
            <div className="text-xs text-[#888] uppercase tracking-widest">اختر الخطة</div>
            {Object.entries(PLAN_PRICES).map(([key, { label, price }]) => (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`w-full flex items-center justify-between px-4 py-4 border transition-colors text-left
                  ${selected === key
                    ? "border-[#F5C100] bg-[#F5C100]/5"
                    : "border-[#2A2A2A] hover:border-[#444]"}`}
              >
                <div>
                  <div className={`font-bold ${selected === key ? "text-[#F5C100]" : "text-white"}`}>
                    {label}
                  </div>
                  <div className="text-xs text-[#666] mt-0.5">
                    {key === "monthly" && "30 يوماً"}
                    {key === "quarterly" && "90 يوماً — وفر 15%"}
                    {key === "annual" && "365 يوماً — وفر 29%"}
                  </div>
                </div>
                <div className={`font-black text-lg ${selected === key ? "text-[#F5C100]" : "text-[#888]"}`}>
                  {price} ر.س
                </div>
              </button>
            ))}
          </div>

          {/* Note */}
          <div className="bg-[#0A0A0A] border border-[#1E1E1E] px-4 py-3 text-xs text-[#666] leading-relaxed">
            سيتواصل معك موظفو الاستقبال لإتمام عملية الدفع وتفعيل الاشتراك.
          </div>

          {/* Submit */}
          <button
            onClick={() => setSubmitted(true)}
            className="w-full bg-[#F5C100] text-black font-black py-4 uppercase tracking-widest
                       text-sm hover:bg-[#e6b400] transition-colors"
          >
            طلب التجديد — {PLAN_PRICES[selected]?.label}
          </button>

          <Link
            href="/portal"
            className="block text-center text-[#666] text-sm hover:text-[#888] transition-colors"
          >
            العودة للبوابة
          </Link>
        </div>
      </div>
    </div>
  );
}
