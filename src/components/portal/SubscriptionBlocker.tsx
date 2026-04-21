"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createBrowserSupabase } from "@/lib/supabase";
import { daysUntilExpiry } from "@/lib/subscription";
import { OxLock } from "@/components/icons/OxIcons";

interface Props {
  children: React.ReactNode;
}

export function SubscriptionBlocker({ children }: Props) {
  const [status, setStatus] = useState<"checking" | "open" | "locked">("checking");

  useEffect(() => {
    async function check() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        // Not logged in — let auth guard handle it
        if (!user) { setStatus("open"); return; }

        const { data: member } = await supabase
          .from("members")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!member) { setStatus("open"); return; }

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("end_date")
          .eq("member_id", member.id)
          .eq("status", "active")
          .order("end_date", { ascending: false })
          .limit(1)
          .single();

        const days = daysUntilExpiry(sub?.end_date ?? null);
        setStatus(days < -2 ? "locked" : "open");
      } catch {
        setStatus("open"); // fail open — don't lock on network error
      }
    }
    check();
  }, []);

  if (status === "checking") return null;

  if (status === "locked") {
    return (
      <div className="fixed inset-0 bg-void z-[200] flex flex-col items-center justify-center px-6" dir="rtl">
        {/* Background figure */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-5">
          <Image src="/fig-flex.png" alt="" fill className="object-cover object-center" unoptimized />
        </div>

        {/* Hazard stripe top */}
        <div className="absolute top-0 left-0 right-0 h-2 danger-tape" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Lock icon */}
          <div className="w-20 h-20 bg-danger/10 border border-danger/20 flex items-center justify-center mb-6">
            <OxLock size={32} className="text-danger" />
          </div>

          {/* OX Logo */}
          <Image src="/ox-logo.png" alt="OX GYM" width={80} height={80} className="w-12 h-12 object-contain mb-5 opacity-40" unoptimized />

          <h2 className="text-white font-display text-[28px] tracking-wider leading-none mb-3">
            انتهت عضويتك
          </h2>
          <p className="text-white/40 text-[15px] leading-relaxed mb-2">
            لقد انتهت فترة الاشتراك ومهلة الوصول الممتدة.
          </p>
          <p className="text-white/30 text-[14px] leading-relaxed mb-8">
            تفضّل بزيارة الاستقبال أو تواصل مع فريق OX GYM لتجديد اشتراكك ومواصلة رحلتك.
          </p>

          <div className="w-full h-[1px] bg-white/[0.06] mb-6" />

          <p className="text-gold/60 text-[13px] font-mono tracking-wider">OX GYM</p>
        </div>

        {/* Hazard stripe bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-2 danger-tape" />
      </div>
    );
  }

  return <>{children}</>;
}
