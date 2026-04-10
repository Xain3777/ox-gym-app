"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import type {
  NotificationType,
  NotificationAudience,
  Member,
} from "@/types";

interface Props {
  onSent: () => void;
}

export function SendNotificationForm({ onSent }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<NotificationType>("announcement");
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [memberId, setMemberId] = useState("");
  const [members, setMembers] = useState<Pick<Member, "id" | "full_name" | "email">[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load members when audience is "specific"
  useEffect(() => {
    if (audience !== "specific") return;
    const supabase = createBrowserSupabase();
    supabase
      .from("members")
      .select("id, full_name, email")
      .order("full_name")
      .then(({ data }) => {
        if (data) setMembers(data);
      });
  }, [audience]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        message,
        audience,
        member_id: audience === "specific" ? memberId : undefined,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      setError(data.error ?? "Failed to send");
      setLoading(false);
      return;
    }

    // Reset form
    setTitle("");
    setMessage("");
    setMemberId("");
    setLoading(false);
    onSent();
  }

  const inputClass =
    "w-full h-11 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors";
  const labelClass =
    "font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className={labelClass}>{t("notifications.type")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as NotificationType)}
            className={inputClass}
          >
            <option value="announcement">{t("notifications.announcement")}</option>
            <option value="reminder">{t("notifications.reminder")}</option>
            <option value="promotion">{t("notifications.promotion")}</option>
            <option value="alert">{t("notifications.alert")}</option>
          </select>
        </div>

        {/* Audience */}
        <div>
          <label className={labelClass}>{t("notifications.audience")}</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as NotificationAudience)}
            className={inputClass}
          >
            <option value="all">{t("notifications.all")}</option>
            <option value="active">{t("notifications.active")}</option>
            <option value="expiring">{t("notifications.expiring")}</option>
            <option value="specific">{t("notifications.specific")}</option>
          </select>
        </div>
      </div>

      {/* Specific member selector */}
      {audience === "specific" && (
        <div>
          <label className={labelClass}>{t("notifications.selectMember")}</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">--</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>{t("notifications.messageTitle")}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClass}
          placeholder="e.g. New Year Promo"
        />
      </div>

      {/* Message */}
      <div>
        <label className={labelClass}>{t("notifications.message")}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          className="w-full px-4 py-3 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors resize-none"
          placeholder="Write your notification message..."
        />
      </div>

      <Button type="submit" loading={loading}>
        {t("notifications.sendAction")}
      </Button>
    </form>
  );
}
