"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  phone: string;
  className?: string;
}

interface Match {
  id: string;
  full_name: string;
}

// Debounced (350ms) live phone-collision check. Calls the
// reception-only lookup endpoint; renders nothing while idle / no match.
export function PhoneCollisionWarning({ phone, className }: Props) {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    setMatch(null);
    const trimmed = phone.trim();
    if (trimmed.length < 7) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/members/lookup-phone?phone=${encodeURIComponent(trimmed)}`);
        if (cancelled || !r.ok) return;
        const j = await r.json();
        if (j?.data) setMatch(j.data as Match);
      } catch { /* network jitter — ignore */ }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone]);

  if (!match) return null;

  return (
    <div className={`flex items-start gap-2 mt-2 p-3 bg-gold/10 border border-gold/30 ${className ?? ""}`} dir="rtl">
      <AlertTriangle size={14} className="text-gold flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-gold text-[12px] font-semibold">هذا الرقم موجود مسبقاً</p>
        <p className="text-white/55 text-[11px] mt-0.5">
          مسجّل باسم <span className="text-white">{match.full_name}</span> — قد يكون نفس الشخص.
        </p>
      </div>
    </div>
  );
}
