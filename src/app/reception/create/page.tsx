"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { normalizePhone } from "@/lib/phone";
import { UserPlus, CheckCircle, AlertCircle, Copy, KeyRound, Printer, MessageCircle } from "lucide-react";
import { PhoneCollisionWarning } from "@/components/reception/PhoneCollisionWarning";

// Opens a minimal print window with the member's activation card —
// reception prints it and hands it over with the receipt.
function printActivationCard(name: string, phone: string, code: string) {
  const w = window.open("", "_blank", "width=420,height=520");
  if (!w) return;
  w.document.write(`<!doctype html><html dir="rtl"><head><title>OX GYM</title><style>
    body { font-family: sans-serif; text-align: center; padding: 32px 16px; color: #111; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: 2px; }
    .name { font-size: 16px; margin-top: 16px; }
    .phone { font-size: 13px; color: #555; direction: ltr; }
    .label { font-size: 11px; color: #777; margin-top: 24px; letter-spacing: 1px; }
    .code { font-size: 34px; font-weight: 800; letter-spacing: 6px; direction: ltr; margin-top: 4px; }
    .note { font-size: 12px; color: #555; margin-top: 24px; line-height: 1.7; }
  </style></head><body>
    <div class="brand">OX GYM</div>
    <div class="name">${name}</div>
    <div class="phone">${phone}</div>
    <div class="label">ACTIVATION CODE — كود التفعيل</div>
    <div class="code">${code}</div>
    <div class="note">حسابك مفعّل ومربوط بالاشتراك تلقائياً.<br/>احتفظ بهذا الكود كمرجع.</div>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

interface FormData {
  full_name: string;
  phone:     string;
  password:  string;
  goals:     string;
  plan_type: "monthly" | "quarterly" | "annual";
  start_date: string;
  end_date:   string;
  price:      string;
}

interface FormErrors {
  full_name?: string;
  phone?:     string;
  password?:  string;
  start_date?: string;
  end_date?:   string;
  price?:      string;
}

function validate(data: FormData, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};
  if (!data.full_name.trim()) errors.full_name = t("validation.nameRequired");
  if (!data.phone.trim()) errors.phone = t("validation.required");
  else if (!/^[\d\s+()-]{7,20}$/.test(data.phone)) errors.phone = t("validation.invalidPhone");
  if (!data.password) errors.password = t("validation.required");
  if (!data.start_date) errors.start_date = t("validation.dateInvalid");
  if (!data.end_date)   errors.end_date   = t("validation.dateInvalid");
  if (data.price && isNaN(Number(data.price))) errors.price = t("validation.priceInvalid");
  return errors;
}

export default function ReceptionCreatePage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<FormData>({
    full_name: "",
    phone:     "",
    password:  "",
    goals:     "",
    plan_type: "monthly",
    start_date: today,
    end_date:   "",
    price:      "",
  });
  const [errors,   setErrors]   = useState<FormErrors>({});
  const [loading,  setLoading]  = useState(false);
  const [created,  setCreated]  = useState<{ full_name: string; phone: string; activation_code: string | null } | null>(null);
  const [apiError, setApiError] = useState("");
  const [copied,   setCopied]   = useState(false);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError("");

    if (field === "plan_type" || field === "start_date") {
      const start = field === "start_date" ? value : form.start_date;
      const type  = field === "plan_type"  ? value : form.plan_type;
      if (start) {
        const d = new Date(start);
        if (type === "monthly")    d.setMonth(d.getMonth() + 1);
        else if (type === "quarterly") d.setMonth(d.getMonth() + 3);
        else if (type === "annual")    d.setFullYear(d.getFullYear() + 1);
        setForm((prev) => ({
          ...prev,
          end_date: d.toISOString().split("T")[0],
          ...(field === "start_date" ? { start_date: value } : { plan_type: value as FormData["plan_type"] }),
        }));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form, t);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const result = await res.json();

      if (!result.success) {
        setApiError(result.error || t("common.error"));
        return;
      }

      setCreated({
        full_name:       result.data?.full_name ?? form.full_name,
        phone:           result.data?.phone ?? form.phone,
        activation_code: result.data?.activation_code ?? null,
      });
      setCopied(false);
      setForm({ full_name: "", phone: "", password: "", goals: "", plan_type: "monthly", start_date: today, end_date: "", price: "" });
    } catch {
      setApiError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const planTypes = [
    { value: "monthly",   labelKey: "members.monthly" },
    { value: "quarterly", labelKey: "members.quarterly" },
    { value: "annual",    labelKey: "members.annual" },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-[28px] tracking-wider text-white">{t("reception.createAccount")}</h1>
        <p className="text-white/40 text-[13px] mt-1">{t("reception.createAccountDesc")}</p>
      </div>

      {created && (
        <div className="bg-green-500/10 border border-green-500/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-[14px]">{t("reception.accountCreated")} — {created.full_name}</p>
          </div>
          {/* Activation code — give this to the member. The account is
              already bound to the subscription, so the app works right
              away; the code stays valid as a backup/reference. */}
          <div className="flex items-center gap-3 bg-black/25 border border-white/[0.08] p-3">
            <KeyRound size={16} className="text-gold flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-[10px] font-mono uppercase tracking-wider">{t("reception.activationCode")}</p>
              <p className="text-gold text-[20px] font-mono tracking-[0.2em]" dir="ltr">{created.activation_code ?? "—"}</p>
              <p className="text-white/40 text-[11px] mt-0.5">{t("reception.accountAlreadyActive")}</p>
            </div>
            {created.activation_code && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(created.activation_code!);
                    setCopied(true);
                  } catch { /* ignore */ }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-9 border text-[12px] font-medium transition-colors flex-shrink-0",
                  copied
                    ? "border-green-500/40 text-green-400"
                    : "border-white/[0.1] text-white/60 hover:text-white hover:border-white/25",
                )}
              >
                <Copy size={12} /> {copied ? t("reception.copied") : t("reception.copyCode")}
              </button>
            )}
          </div>
          {/* Hand-over actions: print the card, or WhatsApp it to the member */}
          {created.activation_code && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => printActivationCard(created.full_name, created.phone, created.activation_code!)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 border border-white/[0.1] text-white/60 hover:text-white hover:border-white/25 text-[12px] font-medium transition-colors"
              >
                <Printer size={13} /> {t("reception.printCard")}
              </button>
              <a
                href={`https://wa.me/${normalizePhone(created.phone)}?text=${encodeURIComponent(
                  `OX GYM 🏋️\n${created.full_name}\n${t("reception.activationCode")}: ${created.activation_code}\n${t("reception.accountAlreadyActive")}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 border border-green-500/25 text-green-400/90 hover:text-green-400 hover:border-green-500/50 text-[12px] font-medium transition-colors"
              >
                <MessageCircle size={13} /> {t("reception.sendWhatsApp")}
              </a>
            </div>
          )}
        </div>
      )}

      {apiError && (
        <div className="flex items-center gap-3 bg-danger/10 border border-danger/20 p-4">
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <p className="text-danger text-[14px]">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label={t("members.fullName")} error={errors.full_name} required>
          <input type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className={fieldClass(errors.full_name)} />
        </Field>

        <Field label={t("common.phone")} error={errors.phone} required>
          <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={fieldClass(errors.phone)} placeholder="+964 7XX XXX XXXX" />
        </Field>
        <PhoneCollisionWarning phone={form.phone} />

        <Field label={t("auth.password")} error={errors.password} required>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className={fieldClass(errors.password)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        <Field label={t("members.goals")}>
          <input type="text" value={form.goals} onChange={(e) => update("goals", e.target.value)} className={fieldClass()} />
        </Field>

        <Field label={t("members.planType")} required>
          <div className="flex gap-2">
            {planTypes.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => update("plan_type", pt.value)}
                className={cn(
                  "flex-1 py-2.5 text-[13px] font-medium border transition-colors",
                  form.plan_type === pt.value
                    ? "bg-gold/20 text-gold border-gold/30"
                    : "bg-white/[0.04] text-white/40 border-white/[0.06] hover:text-white/60",
                )}
              >
                {t(pt.labelKey)}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("members.startDate")} error={errors.start_date} required>
            <input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} className={fieldClass(errors.start_date)} />
          </Field>
          <Field label={t("members.endDate")} error={errors.end_date} required>
            <input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} className={fieldClass(errors.end_date)} />
          </Field>
        </div>

        <Field label={t("members.price")} error={errors.price}>
          <input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} className={fieldClass(errors.price)} min="0" step="0.01" />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full py-4 text-[14px] font-bold uppercase tracking-wider transition-all",
            loading
              ? "bg-gold/30 text-gold/50 cursor-not-allowed"
              : "bg-gold text-void hover:bg-gold-high active:scale-[0.98]",
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <UserPlus size={16} />
            {loading ? t("members.creating") : t("members.createMember")}
          </span>
        </button>
      </form>
    </div>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/50 block mb-2">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-danger text-[12px] mt-1.5">{error}</p>}
    </div>
  );
}

function fieldClass(error?: string) {
  return cn(
    "w-full h-11 px-4 bg-white/[0.04] border text-white text-[14px] placeholder:text-white/30 focus:outline-none transition-colors",
    error ? "border-danger/50 focus:border-danger" : "border-white/[0.08] focus:border-gold/50",
  );
}
