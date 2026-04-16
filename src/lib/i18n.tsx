"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

// ── TYPES ──────────────────────────────────────────────────────
export type Locale = "en" | "ar";

type Messages = typeof en;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

// ── MESSAGES MAP ───────────────────────────────────────────────
const messages: Record<Locale, Messages> = { en, ar };

// ── CONTEXT ────────────────────────────────────────────────────
const I18nContext = createContext<I18nContextValue | null>(null);

// ── HELPER: resolve nested key like "dashboard.title" ─────────
function resolve(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path; // fallback: return the key itself
    }
  }
  return typeof current === "string" ? current : path;
}

// ── PROVIDER ───────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  // Read saved preference on mount; default to Arabic if no preference saved
  useEffect(() => {
    const saved = localStorage.getItem("ox-lang") as Locale | null;
    if (saved === "ar" || saved === "en") {
      setLocaleState(saved);
    } else {
      // First launch: persist Arabic as default
      localStorage.setItem("ox-lang", "ar");
    }
  }, []);

  // Apply dir and lang to <html> whenever locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("ox-lang", l);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  const t = useCallback(
    (key: string) => resolve(messages[locale] as unknown as Record<string, unknown>, key),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── HOOK ───────────────────────────────────────────────────────
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside <LanguageProvider>");
  return ctx;
}
