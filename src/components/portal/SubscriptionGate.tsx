"use client";

import {
  daysUntilExpiry,
  getDetailedStatus,
  isFeatureLocked,
} from "@/lib/subscription";
import { OxLock } from "@/components/icons/OxIcons";
import { GYM_RECEPTION_PHONE, GYM_RECEPTION_PHONE_TEL } from "@/lib/gym-contact";

interface SubscriptionGateProps {
  endDate: string | null;
  children: React.ReactNode;
}

/**
 * Wraps premium content. The app locks the moment the subscription
 * ends (days < 0). Different polite Arabic copy is shown depending on
 * whether the player is in the 2-day gym-grace window (their physical
 * gym access continues, but the app is closed) or past it (hard lock).
 */
export function SubscriptionGate({ endDate, children }: SubscriptionGateProps) {
  if (!isFeatureLocked(endDate)) {
    return <>{children}</>;
  }

  const status = getDetailedStatus(endDate);
  const days   = daysUntilExpiry(endDate);

  const inGracePeriod = status === "grace";
  // days = 0 → ended today, +2 days at the gym remaining
  // days = -1 → +1 day at the gym remaining
  const gymDaysLeft = inGracePeriod ? Math.max(0, 2 + days) : 0;

  const title = inGracePeriod
    ? "اشتراكك انتهى"
    : "انتهى اشتراكك 🌱";

  const message = inGracePeriod
    ? (gymDaysLeft >= 2
        ? "لديك يومان للتدريب في النادي قبل قفل الوصول. الرجاء التجديد."
        : "اليوم آخر يوم تستطيع فيه التدريب في النادي. الرجاء التجديد.")
    : "شكراً لكونك جزءاً من OX GYM. لمتابعة رحلتك معنا، تفضّل بزيارة الاستقبال أو اتصل بنا.";

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
          <h3 className="text-white text-[20px] font-bold mb-2">{title}</h3>
          <p className="text-white/55 text-[14px] leading-relaxed">{message}</p>

          {inGracePeriod && gymDaysLeft > 0 && (
            <div className="mt-4 bg-gold/[0.06] border border-gold/15 px-4 py-2 inline-block">
              <p className="text-gold text-[12px] font-bold">
                {gymDaysLeft === 1 ? "يوم واحد متبقٍ في النادي" : "يومان متبقّيان في النادي"}
              </p>
            </div>
          )}

          <a
            href={GYM_RECEPTION_PHONE_TEL}
            className="mt-5 inline-flex items-center justify-center w-full bg-gold/10 hover:bg-gold/20 border border-gold/25 text-gold font-bold text-[15px] py-3 transition-colors"
            dir="ltr"
          >
            {GYM_RECEPTION_PHONE}
          </a>
          <p className="text-white/30 text-[11px] mt-3">اتصل بالاستقبال أو زرنا في الجيم</p>
        </div>
      </div>
    </div>
  );
}
