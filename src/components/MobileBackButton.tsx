"use client";

import { usePathname, useRouter } from "next/navigation";
import { OxChevronLeft } from "@/components/icons/OxIcons";

// Routes where a "back" action makes no sense — these are role-home or
// auth roots. The button hides itself on these.
const HIDE_ON: readonly string[] = [
  "/",
  "/portal",
  "/dashboard",
  "/coach",
  "/reception",
  "/finance",
  "/login",
  "/staff-login",
  "/signup",
  "/onboarding",
];

export function MobileBackButton() {
  const pathname = usePathname() ?? "/";
  const router   = useRouter();

  if (HIDE_ON.includes(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="back"
      className="
        md:hidden fixed top-3 z-[150]
        rtl:right-3 ltr:left-3
        w-10 h-10 flex items-center justify-center
        bg-void/80 backdrop-blur-md
        border border-gold/25 hover:border-gold/45
        shadow-[0_4px_12px_rgba(0,0,0,0.45)]
        active:scale-95 transition-all duration-150
      "
    >
      <OxChevronLeft size={20} className="text-gold rtl:rotate-180" />
    </button>
  );
}
