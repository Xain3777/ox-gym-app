"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const ROLE_BUTTONS = [
  { key: "player",    path: "/portal" },
  { key: "coach",     path: "/coach" },
  { key: "reception", path: "/reception" },
  { key: "manager",   path: "/dashboard" },
] as const;

function detectRole(pathname: string): string {
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/members") ||
      pathname.startsWith("/plans") || pathname.startsWith("/meal-plans") ||
      pathname.startsWith("/subscriptions") || pathname.startsWith("/notifications") ||
      pathname.startsWith("/reminders") || pathname.startsWith("/settings")) return "manager";
  if (pathname.startsWith("/coach"))     return "coach";
  if (pathname.startsWith("/reception")) return "reception";
  return "player";
}

export function RoleSwitch({ className }: { className?: string }) {
  const pathname = usePathname();
  const currentRole = detectRole(pathname);
  const [loggedIn, setLoggedIn] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    async function check() {
      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setLoggedIn(true);
    }
    check();
  }, []);

  if (!loggedIn) return null;

  function switchTo(role: typeof ROLE_BUTTONS[number]) {
    document.cookie = `test-role=${role.key}; path=/; max-age=86400`;
    window.location.href = role.path;
  }

  return (
    <div className={cn("inline-flex items-center border border-steel overflow-hidden", className)}>
      {ROLE_BUTTONS.map((role) => (
        <button
          key={role.key}
          onClick={() => switchTo(role)}
          className={cn(
            "px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors duration-fast",
            currentRole === role.key
              ? "bg-gold text-void font-bold"
              : "bg-charcoal text-muted hover:text-offwhite",
          )}
        >
          {t(`roles.${role.key}`)}
        </button>
      ))}
    </div>
  );
}
