"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

// ── DECORATIVE BULL IMAGES ───────────────────────────────────
// Place these subtly across pages for visual depth and identity.
// Uses very low opacity (10–15%) to avoid interfering with text.

type BullVariant = "walk" | "press" | "flex" | "chevron" | "logo" | "figure1" | "figure2" | "figure3" | "figure4";

const variants: Record<BullVariant, string> = {
  walk:    "/bull-walk.png",
  press:   "/bull-press.png",
  flex:    "/bull-flex.png",
  chevron: "/chevron-stripe.png",
  logo:    "/ox-logo.png",
  figure1: "/bull-figure-1.png",
  figure2: "/bull-figure-2.png",
  figure3: "/bull-figure-3.png",
  figure4: "/bull-figure-4.png",
};

type Position =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "center-right"
  | "center-left";

const positionClasses: Record<Position, string> = {
  "top-right":    "top-0 right-0",
  "top-left":     "top-0 left-0",
  "bottom-right": "bottom-0 right-0",
  "bottom-left":  "bottom-0 left-0",
  "center-right": "top-1/2 -translate-y-1/2 right-0",
  "center-left":  "top-1/2 -translate-y-1/2 left-0",
};

interface BullDecorProps {
  variant:    BullVariant;
  position:   Position;
  /** Width in px — height auto-scales */
  size?:      number;
  /** Opacity 0–100 (default: 12 = 12%) */
  opacity?:   number;
  className?: string;
  /** Flip the image horizontally */
  flip?:      boolean;
}

export function BullDecor({
  variant,
  position,
  size = 300,
  opacity = 12,
  className,
  flip = false,
}: BullDecorProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-none select-none overflow-hidden z-0",
        positionClasses[position],
        className,
      )}
      style={{
        opacity: opacity / 100,
        width: size,
        height: size,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
      aria-hidden="true"
    >
      <Image
        src={variants[variant]}
        alt=""
        fill
        className="object-contain"
        sizes={`${size}px`}
        priority={false}
      />
    </div>
  );
}

// ── LOGO WATERMARK ───────────────────────────────────────────
interface LogoWatermarkProps {
  position?:  Position;
  size?:      number;
  opacity?:   number;
  className?: string;
}

export function LogoWatermark({
  position = "bottom-right",
  size = 120,
  opacity = 10,
  className,
}: LogoWatermarkProps) {
  return (
    <BullDecor
      variant="logo"
      position={position}
      size={size}
      opacity={opacity}
      className={className}
    />
  );
}
