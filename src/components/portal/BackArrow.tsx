"use client";

import { useRouter } from "next/navigation";
import { OxChevronLeft } from "@/components/icons/OxIcons";

interface BackArrowProps {
  href?: string;
  label?: string;
  className?: string;
}

/**
 * OX Brand back arrow — gold chevron, bold & powerful.
 * Styled after the gold chevron stripe pattern from OX posters.
 */
export function BackArrow({ href, label, className }: BackArrowProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`group flex items-center gap-2 mb-5 -ml-1 transition-all duration-200${className ? ` ${className}` : ""}`}
    >
      <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 group-active:scale-95 transition-all duration-200">
        <OxChevronLeft size={20} className="text-gold" />
      </div>
      {label && (
        <span className="text-gold text-[14px] font-semibold tracking-wide group-hover:text-gold-high transition-colors">
          {label}
        </span>
      )}
    </button>
  );
}
