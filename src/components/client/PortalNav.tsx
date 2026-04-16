"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import {
  OxHome, OxDumbbell, OxBag, OxMore, OxUser, OxTrendUp, OxPulse,
  OxFork, OxTrainer, OxChat, OxStar, OxGear, OxSettings, OxInfo,
  OxLogout, OxTrophy,
} from "@/components/icons/OxIcons";

// ── TYPES ───────────────────────────────────────────────────────
interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

// ── BOTTOM NAV ITEMS (4 tabs) ───────────────────────────────────
const bottomNavItems: NavItem[] = [
  { labelKey: "nav.home",      href: "/portal",             icon: OxHome,   exact: true },
  { labelKey: "nav.challenge", href: "/portal/challenges",  icon: OxTrophy },
  { labelKey: "nav.shop",      href: "/portal/shop",        icon: OxBag },
  { labelKey: "nav.more",      href: "/portal/more",        icon: OxMore },
];

// ── SIDEBAR SECTIONS (desktop) ──────────────────────────────────
interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const sidebarSections: NavSection[] = [
  {
    titleKey: "nav.main",
    items: [
      { labelKey: "nav.home",     href: "/portal",          icon: OxHome, exact: true },
      { labelKey: "more.profile", href: "/portal/profile",  icon: OxUser },
    ],
  },
  {
    titleKey: "more.training",
    items: [
      { labelKey: "portal.myWorkout", href: "/portal/workouts", icon: OxDumbbell },
      { labelKey: "portal.myMeals",   href: "/portal/meals",    icon: OxFork },
      { labelKey: "more.progress",    href: "/portal/progress",  icon: OxTrendUp },
      { labelKey: "more.inbody",      href: "/portal/inbody",    icon: OxPulse },
    ],
  },
  {
    titleKey: "nav.shop",
    items: [
      { labelKey: "nav.shop", href: "/portal/shop", icon: OxBag },
    ],
  },
  {
    titleKey: "more.support",
    items: [
      { labelKey: "more.personalTrainer", href: "/portal/trainer",   icon: OxTrainer },
      { labelKey: "more.messages",        href: "/portal/messages",  icon: OxChat },
      { labelKey: "more.feedback",        href: "/portal/feedback",  icon: OxStar },
    ],
  },
  {
    titleKey: "more.account",
    items: [
      { labelKey: "more.gymInfo",   href: "/portal/gym-info",  icon: OxInfo },
      { labelKey: "more.machines",  href: "/portal/machines",  icon: OxGear },
      { labelKey: "more.settings",  href: "/portal/settings",  icon: OxSettings },
    ],
  },
];

// ── HELPERS ─────────────────────────────────────────────────────
function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

// ── PORTAL SIDEBAR (desktop) ────────────────────────────────────
export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogout = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="hidden lg:flex flex-col w-[260px] min-h-screen bg-[#0D0D0D] border-r border-white/[0.06] rtl:border-r-0 rtl:border-l rtl:border-white/[0.06]">
      {/* Brand Header — OX Logo */}
      <div className="flex items-center gap-3 px-6 py-7">
        <Image src="/ox-logo.png" alt="OX GYM" width={100} height={100} className="w-11 h-11 object-contain" unoptimized />
        <div>
          <span className="text-gold font-display text-[22px] tracking-wider leading-none block">OX GYM</span>
          <span className="text-[11px] text-white/40 mt-0.5 block">{t("roles.player")}</span>
        </div>
      </div>
      <div className="h-[2px] mx-4 mb-2" style={{ backgroundImage: "repeating-linear-gradient(90deg, #F5C100 0px, #F5C100 4px, transparent 4px, transparent 8px)", opacity: 0.3 }} />

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sidebarSections.map((section) => (
          <div key={section.titleKey} className="mb-5">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">
                {t(section.titleKey)}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                const Icon = item.icon;
                return (
                  <Link key={item.href + item.labelKey} href={item.href}
                    className={cn("flex items-center gap-3 rounded-lg py-2.5 px-3 text-[14px] transition-all duration-200",
                      active ? "bg-gold/10 text-gold border border-gold/20" : "text-white/50 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    )}>
                    <Icon size={18} />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-5 border-t border-white/[0.06]">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-lg py-2.5 px-3 text-[14px] text-white/40 hover:text-danger hover:bg-danger/[0.06] transition-all duration-200">
          <OxLogout size={18} />
          <span>{t("auth.logout")}</span>
        </button>
      </div>
    </aside>
  );
}

// ── PORTAL BOTTOM NAV (mobile — 4 tabs) ────────────────────────
export function PortalBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-[#0D0D0D]/95 backdrop-blur-xl border-t border-gold/10">
        <div className="grid grid-cols-4 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200",
                  active ? "text-gold" : "text-white/35"
                )}>
                <div className="relative">
                  <Icon size={22} />
                  {active && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />}
                </div>
                <span className={cn("text-[10px] font-medium", active && "text-gold")}>
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
}
