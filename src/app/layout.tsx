import type { Metadata, Viewport } from "next";
import { Bebas_Neue, DM_Sans, DM_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";
import "../styles/animations.css";

// ── FONT LOADING ──────────────────────────────────────────────
// next/font handles subsetting, self-hosting, and zero layout shift.

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  axes: ["opsz"],
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// ── METADATA ──────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "OX Gym",
    template: "%s · OX Gym",
  },
  description:
    "OX Gym — Where power, discipline, and progress come together. Premium gym management platform.",
  keywords: ["gym", "fitness", "workout", "OX Gym"],
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ── ROOT LAYOUT ───────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Font CSS variables injected here — available app-wide
      className={`${bebasNeue.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="bg-void text-offwhite font-body antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
