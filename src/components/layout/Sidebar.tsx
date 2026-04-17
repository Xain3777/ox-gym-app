"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  CreditCard,
  Bell,
  MessageSquare,
  Settings,
  TrendingUp,
  Package,
  Activity,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { LogoutButton } from "@/components/ui/LogoutConfirm";

// ── NAV ITEMS ─────────────────────────────────────────────────
const navSections = [
  {
    label: "الرئيسية",
    items: [
      { label: "لوحة التحكم",     href: "/dashboard",      icon: LayoutDashboard },
      { label: "الأعضاء",         href: "/members",        icon: Users },
      { label: "برامج التمارين",  href: "/plans",          icon: Dumbbell },
      { label: "خطط الوجبات",     href: "/meal-plans",     icon: UtensilsCrossed },
      { label: "الاشتراكات",      href: "/subscriptions",  icon: CreditCard },
    ],
  },
  {
    label: "المالية والمتجر",
    items: [
      { label: "الملخص المالي",   href: "/finance",        icon: TrendingUp },
      { label: "أسعار المنتجات",  href: "/finance/prices", icon: DollarSign },
      { label: "سجل InBody",      href: "/finance/inbody", icon: Activity },
      { label: "سجل المتجر",      href: "/finance/store",  icon: Package },
    ],
  },
  {
    label: "النظام",
    items: [
      { label: "الإشعارات",       href: "/notifications",  icon: MessageSquare },
      { label: "التذكيرات",       href: "/reminders",      icon: Bell },
      { label: "الإعدادات",       href: "/settings",       icon: Settings },
    ],
  },
];

// ── SIDEBAR ───────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="w-[250px] flex-shrink-0 bg-charcoal border-l border-steel flex flex-col h-full" dir="rtl">
      {/* Brand mark */}
      <div className="border-b border-steel">
        <div className="flex items-center gap-3 px-6 py-5">
          <Image src="/ox-logo.png" alt="OX GYM" width={40} height={40} className="flex-shrink-0" />
          <div>
            <span className="font-display text-[24px] tracking-[0.06em] text-gold leading-none block">GYM</span>
            <span className="font-mono text-[8px] tracking-[0.3em] text-danger uppercase block mt-0.5">
              {t("roles.manager")}
            </span>
          </div>
        </div>
        <div className="ox-stripe-red" />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-slate px-6 mb-2 mt-3">
              {section.label}
            </p>
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
                      "flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-none transition-all duration-fast",
                      isActive
                        ? "text-gold bg-gold/8 border-r-[3px] border-r-gold"
                        : "text-muted border-r-[3px] border-r-transparent hover:text-offwhite hover:bg-iron",
                    )}
                  >
                    <span className="relative flex-shrink-0">
                      <Icon size={16} className={isActive ? "text-gold" : "text-slate"} />
                      {isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-[5px] h-[5px] bg-danger rounded-full" />
                      )}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Switches + Logout */}
      <div className="px-5 py-4 border-t border-steel space-y-3">
        <LanguageSwitch />
        <LogoutButton />
        <p className="font-mono text-[9px] tracking-[0.2em] text-gold/40 uppercase">
          {t("common.tagline")}
        </p>
      </div>
    </aside>
  );
}

// ── MOBILE BOTTOM NAV ─────────────────────────────────────────
const mobileNavItems = [
  { label: "الرئيسية",   href: "/dashboard",   icon: LayoutDashboard },
  { label: "الأعضاء",   href: "/members",     icon: Users },
  { label: "المالية",   href: "/finance",     icon: TrendingUp },
  { label: "الإعدادات", href: "/settings",    icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

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
              "flex flex-col items-center justify-center gap-1 font-mono text-[8px] tracking-[0.08em] uppercase transition-colors duration-fast border-t-2",
              isActive ? "text-gold bg-gold/5 border-t-gold" : "text-muted border-t-transparent",
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
