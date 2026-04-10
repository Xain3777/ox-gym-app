import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── BRAND COLORS ───────────────────────────────────────────
      colors: {
        // Foundation blacks (maps to --ox-* CSS vars)
        void:     "#0A0A0A",
        charcoal: "#111111",
        iron:     "#1A1A1A",
        gunmetal: "#252525",
        steel:    "#333333",
        slate:    "#555555",
        muted:    "#777777",
        ghost:    "#AAAAAA",
        offwhite: "#F0EDE6",

        // Brand gold
        gold: {
          DEFAULT: "#F5C100",
          high:    "#FFD740",
          deep:    "#C49A00",
          dim:     "#8A6D00",
          "10":    "rgba(245,193,0,0.10)",
          "20":    "rgba(245,193,0,0.20)",
          "05":    "rgba(245,193,0,0.05)",
        },

        // Accent red (the 10% energy smudge — horn tips, first letters, CTAs)
        danger: {
          DEFAULT: "#D42B2B",
          bright:  "#FF3333",
          deep:    "#8B1A1A",
          "10":    "rgba(212,43,43,0.12)",
          "06":    "rgba(212,43,43,0.06)",
        },

        // Status green
        success: {
          DEFAULT: "#5CC45C",
          "12":    "rgba(92,196,92,0.12)",
        },
      },

      // ─── TYPOGRAPHY ─────────────────────────────────────────────
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body:    ["var(--font-body)",    "sans-serif"],
        mono:    ["var(--font-mono)",    "monospace"],
      },

      fontSize: {
        // Display scale (Bebas Neue)
        "display-xl": ["clamp(64px, 12vw, 120px)", { lineHeight: "0.88", letterSpacing: "0.02em" }],
        "display-lg": ["64px",  { lineHeight: "0.9",  letterSpacing: "0.03em" }],
        "display-md": ["40px",  { lineHeight: "1",    letterSpacing: "0.04em" }],
        "display-sm": ["28px",  { lineHeight: "1",    letterSpacing: "0.05em" }],
        "display-xs": ["22px",  { lineHeight: "1",    letterSpacing: "0.06em" }],

        // UI scale (DM Sans)
        "ui-xl":   ["18px", { lineHeight: "1.4" }],
        "ui-lg":   ["16px", { lineHeight: "1.5" }],
        "ui-base": ["15px", { lineHeight: "1.7" }],
        "ui-sm":   ["13px", { lineHeight: "1.6" }],
        "ui-xs":   ["12px", { lineHeight: "1.5" }],

        // Mono/label scale (DM Mono)
        "label-lg": ["11px", { lineHeight: "1", letterSpacing: "0.14em" }],
        "label-sm": ["10px", { lineHeight: "1", letterSpacing: "0.15em" }],
        "eyebrow":  ["10px", { lineHeight: "1", letterSpacing: "0.20em" }],
        "tagline":  ["11px", { lineHeight: "1", letterSpacing: "0.30em" }],
      },

      // ─── SPACING (8px base grid) ────────────────────────────────
      spacing: {
        // Extends Tailwind defaults — only custom additions needed
        "18": "72px",
        "22": "88px",
        "26": "104px",
        "30": "120px",
      },

      // ─── BORDER RADIUS ──────────────────────────────────────────
      // Almost zero by design — hard edges are the brand
      borderRadius: {
        none:  "0px",
        badge: "2px",  // only for status pills
        // Everything else: 0 or clip-path (see utilities)
      },

      // ─── BORDER WIDTH ───────────────────────────────────────────
      borderWidth: {
        DEFAULT: "1px",
        "0":  "0",
        "2":  "2px",
        "3":  "3px",
        "4":  "4px",
      },

      // ─── BOX SHADOW / GLOW ──────────────────────────────────────
      boxShadow: {
        none:       "none",
        "gold-sm":  "0 0 0 1px rgba(245,193,0,0.15)",
        "gold-md":  "0 0 0 1px rgba(245,193,0,0.35)",
        "gold-lg":  "0 0 20px rgba(245,193,0,0.20)",
        "gold-bar": "inset 0 -2px 0 #F5C100",
        "red-sm":   "0 0 0 1px rgba(212,43,43,0.20)",
        "red-md":   "0 0 8px rgba(212,43,43,0.25)",
        "red-glow": "0 0 12px 2px rgba(212,43,43,0.30)",
        "dark-lg":  "0 4px 24px rgba(0,0,0,0.6)",
        "dark-xl":  "0 8px 40px rgba(0,0,0,0.8)",
      },

      // ─── ANIMATION ──────────────────────────────────────────────
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "gold-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(245,193,0,0.2)" },
          "50%":       { boxShadow: "0 0 0 3px rgba(245,193,0,0.4)" },
        },
        "chevron-march": {
          "0%":   { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 0" },
        },
        "loading-sweep": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        "count-up": {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "red-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,43,43,0.15)" },
          "50%":       { boxShadow: "0 0 10px 3px rgba(212,43,43,0.25)" },
        },
      },
      animation: {
        "fade-up":        "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in":       "slide-in 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "gold-pulse":     "gold-pulse 1.5s ease-in-out infinite",
        "red-pulse":      "red-pulse 2s ease-in-out infinite",
        "chevron-march":  "chevron-march 1s linear infinite",
        "loading-sweep":  "loading-sweep 1.4s ease-in-out infinite",
        "count-up":       "count-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
      },

      // ─── TRANSITION TIMING ──────────────────────────────────────
      transitionTimingFunction: {
        snap: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        mid:  "220ms",
        slow: "400ms",
      },

      // ─── MAX WIDTH ──────────────────────────────────────────────
      maxWidth: {
        page: "1280px",
        content: "960px",
        prose:   "680px",
      },

      // ─── BACKGROUND IMAGE (pattern utilities) ───────────────────
      backgroundImage: {
        "chevron-pattern": `repeating-linear-gradient(
          45deg,
          transparent 0px, transparent 18px,
          rgba(245,193,0,0.015) 18px, rgba(245,193,0,0.015) 20px
        )`,
        "chevron-pattern-dense": `repeating-linear-gradient(
          45deg,
          transparent 0px, transparent 18px,
          rgba(245,193,0,0.06) 18px, rgba(245,193,0,0.06) 20px
        )`,
        "hazard-stripe": `repeating-linear-gradient(
          45deg,
          #F5C100 0px, #F5C100 10px,
          #0A0A0A 10px, #0A0A0A 20px
        )`,
        "hazard-stripe-thin": `repeating-linear-gradient(
          45deg,
          #F5C100 0px, #F5C100 4px,
          transparent 4px, transparent 8px
        )`,
        "column-stripe": `repeating-linear-gradient(
          90deg,
          transparent 0px, transparent 18px,
          rgba(245,193,0,0.03) 18px, rgba(245,193,0,0.03) 20px
        )`,
      },

      // ─── HEIGHT ─────────────────────────────────────────────────
      height: {
        "nav":        "52px",
        "bottom-nav": "56px",
        "btn-sm":     "36px",
        "btn-md":     "44px",
        "btn-lg":     "48px",
        "btn-xl":     "56px",
      },

      // ─── Z-INDEX ────────────────────────────────────────────────
      zIndex: {
        nav:     "100",
        modal:   "200",
        toast:   "300",
        overlay: "150",
      },
    },
  },
  plugins: [],
};

export default config;
