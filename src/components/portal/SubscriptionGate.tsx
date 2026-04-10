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
        <div className="rounded-lg bg-iron border border-gold/20 p-8 text-center max-w-sm mx-5">
          <div className="w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
            <OxLock size={24} className="text-gold" />
          </div>
          <h3 className="text-white text-[20px] font-bold mb-2">Subscription Expired</h3>
          <p className="text-white/40 text-[15px] leading-relaxed">Renew your subscription to unlock this feature. Visit the front desk or contact us.</p>
        </div>
      </div>
    </div>
  );
}
