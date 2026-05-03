"use client";

import { usePathname, useRouter } from "next/navigation";
import { OxChevronLeft } from "@/components/icons/OxIcons";

// Routes where a "back" action makes no sense — role-home or auth roots.
// Button hides itself on these so users don't get stranded at the top of
// their nav stack with a useless back arrow.
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

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="رجوع"
      title="رجوع"
      className="
        md:hidden fixed left-3 top-3 z-[150]
        w-10 h-10 flex items-center justify-center
        bg-void/80 backdrop-blur-md
        border border-gold/25 hover:border-gold/45
        shadow-[0_4px_12px_rgba(0,0,0,0.45)]
        active:scale-95 transition-all duration-150
      "
    >
      <OxChevronLeft size={20} className="text-gold" />
    </button>
  );
}
