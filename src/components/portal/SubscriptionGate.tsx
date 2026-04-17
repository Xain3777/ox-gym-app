"use client";

import { isFeatureLocked } from "@/lib/subscription";
import { OxLock } from "@/components/icons/OxIcons";

interface SubscriptionGateProps {
  endDate: string | null;
  children: React.ReactNode;
}

/**
 * Wraps premium content. When the subscription is expired,
 * shows a locked overlay. OX Brand: Gold accent.
 */
export function SubscriptionGate({ endDate, children }: SubscriptionGateProps) {
  if (!isFeatureLocked(endDate)) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[400px]">
      <div className="opacity-15 pointer-events-none select-none blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-iron border border-gold/20 p-8 text-center max-w-sm mx-5" dir="rtl">
          <div className="w-16 h-16 bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
            <OxLock size={24} className="text-gold" />
          </div>
          <h3 className="text-white text-[20px] font-bold mb-2">الاشتراك منتهي</h3>
          <p className="text-white/40 text-[15px] leading-relaxed">جدِّد اشتراكك لفتح هذه الميزة. تفضّل بزيارة الاستقبال أو تواصل معنا.</p>
        </div>
      </div>
    </div>
  );
}
