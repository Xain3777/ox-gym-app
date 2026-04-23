"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { StripeDivider } from "@/components/layout/TopBar";

interface FormState {
  full_name:  string;
  username:   string;
  phone:      string;
  goals:      string;
  plan_type:  "monthly" | "quarterly" | "annual";
  start_date: string;
  end_date:   string;
  price:      string;
}

interface FormErrors {
  full_name?:  string;
  username?:   string;
  start_date?: string;
  end_date?:   string;
}

const today = new Date().toISOString().split("T")[0];

// Auto-calculates end date from start date + plan type
function calcEndDate(start: string, planType: FormState["plan_type"]): string {
  if (!start) return "";
  const d = new Date(start);
  if (planType === "monthly")   d.setMonth(d.getMonth() + 1);
  if (planType === "quarterly") d.setMonth(d.getMonth() + 3);
  if (planType === "annual")    d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

const defaultPrices: Record<FormState["plan_type"], string> = {
  monthly:   "250",
  quarterly: "650",
  annual:    "2200",
};

// ── COMPONENT ─────────────────────────────────────────────────
export function AddMemberForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<FormErrors>({});

  const [form, setForm] = useState<FormState>({
    full_name:  "",
    username:   "",
    phone:      "",
    goals:      "",
    plan_type:  "monthly",
    start_date: today,
    end_date:   calcEndDate(today, "monthly"),
    price:      defaultPrices.monthly,
  });

  // ── FIELD CHANGE ──────────────────────────────────────────
  function handleChange(
    field: keyof FormState,
    value: string,
  ) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-recalculate end date when plan type or start date changes
      if (field === "plan_type" || field === "start_date") {
        const planType  = field === "plan_type" ? (value as FormState["plan_type"]) : prev.plan_type;
        const startDate = field === "start_date" ? value : prev.start_date;
        next.end_date   = calcEndDate(startDate, planType);
      }

      // Auto-fill price when plan type changes
      if (field === "plan_type") {
        next.price = defaultPrices[value as FormState["plan_type"]];
      }

      return next;
    });

    // Clear field error on change
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  // ── VALIDATION ────────────────────────────────────────────
  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.full_name.trim())   e.full_name  = "Full name is required";
    if (!form.username.trim())    e.username   = "Username is required";
    if (!form.start_date)         e.start_date = "Start date is required";
    if (!form.end_date)           e.end_date   = "End date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── SUBMIT ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          price: form.price ? parseFloat(form.price) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toastError("Failed to add member", data.error ?? "Please try again.");
        return;
      }

      success("Member added", `${form.full_name} has been enrolled.`);
      onSuccess?.();
      router.refresh();
    } catch {
      toastError("Network error", "Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Personal info */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-gold mb-3">
          Personal Info
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            required
            placeholder="Ahmed Khalil"
            value={form.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
            error={errors.full_name}
          />
          <Input
            label="Username"
            required
            placeholder="ahmed khalil"
            value={form.username}
            onChange={(e) => handleChange("username", e.target.value)}
            error={errors.username}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Phone"
            type="tel"
            placeholder="+966 50 123 4567"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Goals"
            placeholder="Touch the sky, build strength, lose weight..."
            value={form.goals}
            onChange={(e) => handleChange("goals", e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>

      <StripeDivider thin />

      {/* Subscription */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-gold mb-3">
          Subscription
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Plan Type"
            required
            value={form.plan_type}
            onChange={(e) => handleChange("plan_type", e.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (3 months)</option>
            <option value="annual">Annual (12 months)</option>
          </Select>
          <Input
            label="Price (SAR)"
            type="number"
            min="0"
            step="0.01"
            placeholder="250"
            value={form.price}
            onChange={(e) => handleChange("price", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Input
            label="Start Date"
            required
            type="date"
            value={form.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
            error={errors.start_date}
          />
          <Input
            label="End Date"
            required
            type="date"
            value={form.end_date}
            onChange={(e) => handleChange("end_date", e.target.value)}
            error={errors.end_date}
            hint="Auto-calculated from plan type"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} fullWidth>
          {loading ? "Adding..." : "ADD MEMBER"}
        </Button>
      </div>
    </form>
  );
}
