"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { UserPlus, CheckCircle, AlertCircle } from "lucide-react";

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  goals: string;
  plan_type: "monthly" | "quarterly" | "annual";
  start_date: string;
  end_date: string;
  price: string;
}

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  start_date?: string;
  end_date?: string;
  price?: string;
}

function validate(data: FormData, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};
  if (!data.full_name.trim()) errors.full_name = t("validation.nameRequired");
  if (!data.email.trim()) errors.email = t("validation.emailRequired");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = t("validation.invalidEmail");
  if (data.phone && !/^[\d\s+()-]{7,20}$/.test(data.phone)) errors.phone = t("validation.invalidPhone");
  if (!data.start_date) errors.start_date = t("validation.dateInvalid");
  if (!data.end_date) errors.end_date = t("validation.dateInvalid");
  if (data.price && isNaN(Number(data.price))) errors.price = t("validation.priceInvalid");
  return errors;
}

export default function ReceptionCreatePage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<FormData>({
    full_name: "",
    email: "",
    phone: "",
    goals: "",
    plan_type: "monthly",
    start_date: today,
    end_date: "",
    price: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError("");
    setSuccess(false);

    // Auto-calculate end date based on plan type
    if (field === "plan_type" || field === "start_date") {
      const start = field === "start_date" ? value : form.start_date;
      const type = field === "plan_type" ? value : form.plan_type;
      if (start) {
        const d = new Date(start);
        if (type === "monthly") d.setMonth(d.getMonth() + 1);
        else if (type === "quarterly") d.setMonth(d.getMonth() + 3);
        else if (type === "annual") d.setFullYear(d.getFullYear() + 1);
        setForm((prev) => ({ ...prev, end_date: d.toISOString().split("T")[0], ...(field === "start_date" ? { start_date: value } : { plan_type: value as FormData["plan_type"] }) }));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form, t);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();

      if (!result.success) {
        if (res.status === 409) setApiError(t("members.emailExists"));
        else setApiError(result.error || t("common.error"));
        return;
      }

      setSuccess(true);
      setForm({
        full_name: "", email: "", phone: "", goals: "",
        plan_type: "monthly", start_date: today, end_date: "", price: "",
      });
    } catch {
      setApiError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const planTypes = [
    { value: "monthly", labelKey: "members.monthly" },
    { value: "quarterly", labelKey: "members.quarterly" },
    { value: "annual", labelKey: "members.annual" },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-[28px] tracking-wider text-white">{t("reception.createAccount")}</h1>
        <p className="text-white/40 text-[13px] mt-1">{t("reception.createAccountDesc")}</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 p-4">
          <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-[14px]">{t("reception.accountCreated")}</p>
        </div>
      )}

      {apiError && (
        <div className="flex items-center gap-3 bg-danger/10 border border-danger/20 p-4">
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <p className="text-danger text-[14px]">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <Field label={t("members.fullName")} error={errors.full_name} required>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            className={fieldClass(errors.full_name)}
          />
        </Field>

        {/* Email */}
        <Field label={t("members.email")} error={errors.email} required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={fieldClass(errors.email)}
          />
        </Field>

        {/* Phone */}
        <Field label={t("common.phone")} error={errors.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={fieldClass(errors.phone)}
          />
        </Field>

        {/* Goals */}
        <Field label={t("members.goals")}>
          <input
            type="text"
            value={form.goals}
            onChange={(e) => update("goals", e.target.value)}
            className={fieldClass()}
          />
        </Field>

        {/* Plan Type */}
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
                    ? "bg-[#4ECDC4]/20 text-[#4ECDC4] border-[#4ECDC4]/30"
                    : "bg-white/[0.04] text-white/40 border-white/[0.06] hover:text-white/60"
                )}
              >
                {t(pt.labelKey)}
              </button>
            ))}
          </div>
        </Field>

        {/* Start/End Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("members.startDate")} error={errors.start_date} required>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              className={fieldClass(errors.start_date)}
            />
          </Field>
          <Field label={t("members.endDate")} error={errors.end_date} required>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => update("end_date", e.target.value)}
              className={fieldClass(errors.end_date)}
            />
          </Field>
        </div>

        {/* Price */}
        <Field label={t("members.price")} error={errors.price}>
          <input
            type="number"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            className={fieldClass(errors.price)}
            min="0"
            step="0.01"
          />
        </Field>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full py-4 text-[14px] font-bold uppercase tracking-wider transition-all",
            loading
              ? "bg-[#4ECDC4]/30 text-[#4ECDC4]/50 cursor-not-allowed"
              : "bg-[#4ECDC4] text-void hover:bg-[#4ECDC4]/90 active:scale-[0.98]"
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

// ── Field wrapper ──────────────────────────────────────────────
function Field({ label, error, required, children }: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
    error ? "border-danger/50 focus:border-danger" : "border-white/[0.08] focus:border-[#4ECDC4]/50"
  );
}
