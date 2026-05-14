"use client";

import { isFeatureLocked } from "@/lib/subscription";
import { OxLock } from "@/components/icons/OxIcons";
import { GYM_RECEPTION_PHONE, GYM_RECEPTION_PHONE_TEL } from "@/lib/gym-contact";

interface SubscriptionGateProps {
  endDate: string | null;
  children: React.ReactNode;
}

/**
 * Wraps premium content. When the subscription is missing or expired,
 * shows a locked overlay pointing the user to reception. OX Brand: gold accent.
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
          <h3 className="text-white text-[20px] font-bold mb-2">لا يوجد اشتراك نشط</h3>
          <p className="text-white/50 text-[14px] leading-relaxed">
            لا يوجد اشتراك نشط حالياً. الرجاء زيارة الاستقبال أو الاتصال بنا على:
          </p>
          <a
            href={GYM_RECEPTION_PHONE_TEL}
            className="mt-4 inline-flex items-center justify-center w-full bg-gold/10 hover:bg-gold/20 border border-gold/25 text-gold font-bold text-[15px] py-3 transition-colors"
            dir="ltr"
          >
            {GYM_RECEPTION_PHONE}
          </a>
        </div>
      </div>
    </div>
  );
}
