"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { OxShield } from "@/components/icons/OxIcons";

interface Props {
  onActivated?: () => void;
}

export function ActivationSection({ onActivated }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/activate")
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data?.activated) setActivated(true);
      })
      .catch(() => { /* ignore — fall back to showing the form */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg(t("activation.errorFormat"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setActivated(true);
        setSuccessMsg(t("activation.success"));
        onActivated?.();
        // Force a fresh load so the subscription card on the portal
        // home reflects the newly-claimed row immediately.
        setTimeout(() => { window.location.reload(); }, 600);
        return;
      }
      // Auth-layer rejections show the bare HTTP reason — translate them
      // so the user sees something actionable instead of "Forbidden".
      if (res.status === 401) {
        setErrorMsg("سجّل الدخول مرة أخرى ثم حاول التفعيل.");
        return;
      }
      if (res.status === 403) {
        setErrorMsg("لم يُسمح بالتفعيل. حدّث الصفحة أو سجّل الدخول مرة أخرى.");
        return;
      }
      switch (json?.code) {
        case "INVALID_FORMAT": setErrorMsg(t("activation.errorFormat")); break;
        case "NOT_FOUND":      setErrorMsg(t("activation.errorNotFound")); break;
        case "ALREADY_USED":   setErrorMsg(t("activation.errorAlreadyUsed")); break;
        case "CANCELLED":      setErrorMsg(t("activation.errorCancelled")); break;
        case "NO_DAYS_LEFT":   setErrorMsg(t("activation.errorNoDays")); break;
        default:               setErrorMsg(json?.error ?? t("activation.errorGeneric"));
      }
    } catch {
      setErrorMsg(t("activation.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || activated) return null;

  return (
    <section className="relative bg-white/[0.04] border border-gold/30 p-5 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] danger-tape-thin opacity-50" />
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gold/10 flex items-center justify-center flex-shrink-0">
          <OxShield size={20} className="text-gold" />
        </div>
        <div className="flex-1">
          <p className="text-gold text-[10px] font-mono uppercase tracking-[0.16em]">
            {t("activation.label")}
          </p>
          <p className="text-white text-[15px] font-semibold mt-1 leading-snug">
            {t("activation.prompt")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="QK482917"
          dir="ltr"
          className="w-full h-12 px-4 bg-void/40 border border-white/[0.08] text-white text-[16px] font-mono tracking-[0.2em] placeholder:text-white/20 focus:border-gold/50 focus:outline-none transition-colors text-center"
        />

        {errorMsg && (
          <p className="text-danger text-[12px] text-right">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="text-green-400 text-[12px] text-right">{successMsg}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gold hover:bg-gold-high active:bg-gold-deep disabled:opacity-50 text-void font-bold text-[14px] py-3 uppercase tracking-widest transition-colors"
        >
          {submitting ? t("activation.submitting") : t("activation.submit")}
        </button>
      </form>
    </section>
  );
}
