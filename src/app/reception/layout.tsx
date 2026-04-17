"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { LogoutButton } from "@/components/ui/LogoutConfirm";
import { RoleToggle } from "@/components/client/RoleToggle";
import { ToastProvider } from "@/components/ui/Toast";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  CreditCard,
  ShoppingBag,
  Activity,
} from "lucide-react";

const navItems = [
  { label: "الرئيسية",         href: "/reception",               icon: LayoutDashboard, exact: true },
  { label: "إنشاء حساب",       href: "/reception/create",        icon: UserPlus },
  { label: "الأعضاء",          href: "/reception/members",       icon: Users },
  { label: "الاشتراكات",       href: "/reception/subscriptions", icon: CreditCard },
  { label: "المتجر والمخزون",   href: "/reception/store",         icon: ShoppingBag },
  { label: "جهاز InBody",       href: "/reception/inbody",        icon: Activity },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-void" dir="rtl">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-shrink-0 w-[250px] bg-charcoal border-l border-steel flex-col h-full">
          <div className="border-b border-steel">
            <div className="flex items-center gap-3 px-6 py-5">
              <Image src="/ox-logo.png" alt="OX GYM" width={40} height={40} className="flex-shrink-0" />
              <div>
                <span className="font-display text-[24px] tracking-[0.06em] text-gold leading-none block">GYM</span>
                <span className="font-mono text-[8px] tracking-[0.3em] text-[#4ECDC4] uppercase block mt-0.5">
                  استقبال
                </span>
              </div>
            </div>
            <div className="h-[3px] bg-[#4ECDC4]/60" />
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
                        ? "text-[#4ECDC4] bg-[#4ECDC4]/8 border-r-[3px] border-r-[#4ECDC4]"
                        : "text-muted border-r-[3px] border-r-transparent hover:text-offwhite hover:bg-iron",
                    )}
                  >
                    <Icon size={16} className={active ? "text-[#4ECDC4]" : "text-slate"} />
                    {item.label}
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-charcoal/95 backdrop-blur-sm border-t border-steel grid grid-cols-6 h-16 pb-safe md:hidden">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 font-mono text-[8px] tracking-[0.08em] uppercase transition-colors border-t-2",
                  active ? "text-[#4ECDC4] border-t-[#4ECDC4]" : "text-muted border-t-transparent",
                )}
              >
                <Icon size={18} />
                {item.label.split(" ").slice(-1)[0]}
              </Link>
            );
          })}
        </nav>

        <RoleToggle />
      </div>
    </ToastProvider>
  );
}
