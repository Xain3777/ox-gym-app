"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const ROLES = [
  { key: "player",    path: "/portal",     color: "text-gold border-gold/50 bg-gold/10" },
  { key: "coach",     path: "/coach",      color: "text-[#FF6B35] border-[#FF6B35]/50 bg-[#FF6B35]/10" },
  { key: "reception", path: "/reception",  color: "text-[#4ECDC4] border-[#4ECDC4]/50 bg-[#4ECDC4]/10" },
  { key: "manager",   path: "/dashboard",  color: "text-danger border-danger/50 bg-danger/10" },
] as const;

function detectCurrent(pathname: string): string {
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/members") ||
      pathname.startsWith("/plans") || pathname.startsWith("/meal-plans") ||
      pathname.startsWith("/subscriptions") || pathname.startsWith("/notifications") ||
      pathname.startsWith("/reminders") || pathname.startsWith("/settings")) return "manager";
  if (pathname.startsWith("/coach"))     return "coach";
  if (pathname.startsWith("/reception")) return "reception";
  return "player";
}

export function RoleToggle() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const currentRole = detectCurrent(pathname);

  function switchRole(role: typeof ROLES[number]) {
    document.cookie = `test-role=${role.key}; path=/; max-age=86400`;
    setOpen(false);
    router.push(role.path);
  }

  const labels: Record<string, string> = {
    player: "P",
    coach: "C",
    reception: "R",
    manager: "M",
  };

  return (
    <div className="fixed top-3 right-3 z-[400] rtl:right-auto rtl:left-3">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-9 h-9 flex items-center justify-center border text-[11px] font-bold uppercase transition-all duration-200",
          open ? "bg-gold text-void border-gold" : "bg-void/80 backdrop-blur-sm text-gold/60 border-gold/20 hover:border-gold/40"
        )}
      >
        {labels[currentRole]}
      </button>

      {open && (
        <div className="absolute top-11 right-0 rtl:right-auto rtl:left-0 w-40 bg-iron border border-white/[0.08] overflow-hidden shadow-dark-xl">
          <p className="text-[9px] text-white/25 uppercase tracking-widest px-3 py-2 border-b border-white/[0.04]">
            {t("roles.switchView")}
          </p>
          {ROLES.map((role) => (
            <button
              key={role.key}
              onClick={() => switchRole(role)}
              className={cn(
                "w-full text-left rtl:text-right px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/[0.04] border-b border-white/[0.04] last:border-b-0",
                currentRole === role.key ? role.color : "text-white/50"
              )}
            >
              {t(`roles.${role.key}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
