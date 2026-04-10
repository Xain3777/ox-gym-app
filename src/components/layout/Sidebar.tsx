"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  CreditCard,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";

// ── NAV ITEMS (use translation keys) ──────────────────────────
const navItems = [
  {
    sectionKey: "nav.main",
    items: [
      { labelKey: "nav.dashboard",     href: "/dashboard",      icon: LayoutDashboard },
      { labelKey: "nav.members",       href: "/members",        icon: Users },
      { labelKey: "nav.workoutPlans",  href: "/plans",          icon: Dumbbell },
      { labelKey: "nav.mealPlans",     href: "/meal-plans",     icon: UtensilsCrossed },
      { labelKey: "nav.subscriptions", href: "/subscriptions",  icon: CreditCard },
    ],
  },
  {
    sectionKey: "nav.system",
    items: [
      { labelKey: "nav.notifications", href: "/notifications",  icon: MessageSquare },
      { labelKey: "nav.reminders",     href: "/reminders",      icon: Bell },
      { labelKey: "nav.settings",      href: "/settings",       icon: Settings },
    ],
  },
];

// ── SIDEBAR ───────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[250px] flex-shrink-0 bg-charcoal border-r border-steel flex flex-col h-full">
      {/* Brand mark */}
      <div className="border-b border-steel">
        <div className="flex items-center gap-3 px-6 py-5">
          <Image
            src="/ox-logo.png"
            alt="OX GYM"
            width={40}
            height={40}
            className="flex-shrink-0"
          />
          <div>
            <span className="font-display text-[24px] tracking-[0.06em] text-gold leading-none block">
              GYM
            </span>
            <span className="font-mono text-[8px] tracking-[0.3em] text-danger uppercase block mt-0.5">
              {t("roles.manager")}
            </span>
          </div>
        </div>
        {/* Red energy line */}
        <div className="ox-stripe-red" />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-5 overflow-y-auto">
        {navItems.map((section) => (
          <div key={section.sectionKey} className="mb-3">
            {/* Section label */}
            <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-slate px-6 mb-2 mt-3">
              {t(section.sectionKey)}
            </p>

            {/* Nav items */}
            <div className="space-y-0.5 px-3">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      "text-[13px] font-medium rounded-none",
                      "transition-all duration-fast",
                      isActive
                        ? "text-gold bg-gold/8 border-l-[3px] border-l-gold"
                        : "text-muted border-l-[3px] border-l-transparent hover:text-offwhite hover:bg-iron",
                    )}
                  >
                    <span className="relative flex-shrink-0">
                      <Icon
                        size={16}
                        className={cn(
                          isActive ? "text-gold" : "text-slate",
                        )}
                      />
                      {isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-[5px] h-[5px] bg-danger rounded-full" />
                      )}
                    </span>
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Switches + Logout + Footer */}
      <div className="px-5 py-4 border-t border-steel space-y-3">
        <LanguageSwitch />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-1 py-2 text-[12px] text-muted hover:text-danger transition-colors font-mono tracking-[0.08em] uppercase"
        >
          <LogOut size={13} />
          {t("auth.logout")}
        </button>
        <p className="font-mono text-[9px] tracking-[0.2em] text-gold/40 uppercase">
          {t("common.tagline")}
        </p>
      </div>
    </aside>
  );
}

// ── MOBILE BOTTOM NAV ─────────────────────────────────────────
const mobileNavItems = [
  { labelKey: "nav.home",     href: "/dashboard",     icon: LayoutDashboard },
  { labelKey: "nav.members",  href: "/members",       icon: Users },
  { labelKey: "nav.plans",    href: "/plans",         icon: Dumbbell },
  { labelKey: "nav.settings", href: "/settings",      icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-nav
      bg-charcoal/95 backdrop-blur-sm border-t border-steel
      grid grid-cols-4
      h-bottom-nav pb-safe
      md:hidden
    ">
      {mobileNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1",
              "font-mono text-[8px] tracking-[0.08em] uppercase",
              "transition-colors duration-fast",
              "border-t-2",
              isActive
                ? "text-gold bg-gold/5 border-t-gold"
                : "text-muted border-t-transparent",
            )}
          >
            <Icon size={18} />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
