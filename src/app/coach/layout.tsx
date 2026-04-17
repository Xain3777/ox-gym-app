"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { LogoutButton } from "@/components/ui/LogoutConfirm";
import { RoleToggle } from "@/components/client/RoleToggle";
import { ToastProvider } from "@/components/ui/Toast";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { labelKey: "coach.dashboard",    href: "/coach",          icon: LayoutDashboard, exact: true },
  { labelKey: "coach.myPlayers",    href: "/coach/players",  icon: Users },
  { labelKey: "coach.workoutPlans", href: "/coach/plans",    icon: Dumbbell },
  { labelKey: "coach.mealPlans",    href: "/coach/meals",    icon: UtensilsCrossed },
  { labelKey: "coach.messages",     href: "/coach/messages", icon: MessageSquare },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-void">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-shrink-0 w-[250px] bg-charcoal border-r border-steel rtl:border-r-0 rtl:border-l flex-col h-full">
          <div className="border-b border-steel">
            <div className="flex items-center gap-3 px-6 py-5">
              <Image src="/ox-logo.png" alt="OX GYM" width={40} height={40} className="flex-shrink-0" />
              <div>
                <span className="font-display text-[24px] tracking-[0.06em] text-gold leading-none block">GYM</span>
                <span className="font-mono text-[8px] tracking-[0.3em] text-[#FF6B35] uppercase block mt-0.5">
                  {t("roles.coach")}
                </span>
              </div>
            </div>
            <div className="h-[3px] bg-[#FF6B35]/60" />
          </div>

          <nav className="flex-1 py-5 overflow-y-auto">
            <div className="space-y-0.5 px-3">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-none transition-all duration-200",
                      active
                        ? "text-[#FF6B35] bg-[#FF6B35]/8 border-l-[3px] border-l-[#FF6B35] rtl:border-l-0 rtl:border-r-[3px] rtl:border-r-[#FF6B35]"
                        : "text-muted border-l-[3px] border-l-transparent rtl:border-l-0 rtl:border-r-[3px] rtl:border-r-transparent hover:text-offwhite hover:bg-iron",
                    )}
                  >
                    <Icon size={16} className={active ? "text-[#FF6B35]" : "text-slate"} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="px-5 py-4 border-t border-steel space-y-3">
            <LanguageSwitch />
            <LogoutButton />
          </div>
        </aside>

        {/* Main Content */}
        <main className="relative flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="relative z-10 flex-1 overflow-y-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-charcoal/95 backdrop-blur-sm border-t border-steel grid grid-cols-5 h-16 pb-safe md:hidden">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 font-mono text-[8px] tracking-[0.08em] uppercase transition-colors border-t-2",
                  active ? "text-[#FF6B35] border-t-[#FF6B35]" : "text-muted border-t-transparent",
                )}
              >
                <Icon size={18} />
                {t(item.labelKey).split(" ").slice(-1)[0]}
              </Link>
            );
          })}
        </nav>

        <RoleToggle />
      </div>
    </ToastProvider>
  );
}
