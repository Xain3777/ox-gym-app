"use client";

import { useState, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { TopBar, SectionHeader, StripeDivider } from "@/components/layout/TopBar";
import { SendNotificationForm } from "@/components/admin/SendNotificationForm";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setNotifications(data.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  function handleSent() {
    setShowForm(false);
    fetchNotifications();
  }

  const statusColor: Record<string, string> = {
    sent:    "text-success",
    failed:  "text-danger",
    pending: "text-gold",
  };

  const typeIcon: Record<string, string> = {
    announcement: "bg-gold/10 text-gold",
    reminder:     "bg-blue-500/10 text-blue-400",
    promotion:    "bg-green-500/10 text-green-400",
    alert:        "bg-danger/10 text-danger",
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title={t("notifications.title")}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "flex items-center gap-2 px-5 h-10",
              "font-display text-[13px] tracking-widest",
              "bg-gold text-void clip-corner-sm",
              "hover:bg-gold-high hover:-translate-y-px",
              "active:scale-[0.98]",
              "transition-[background,transform] duration-[120ms]",
            )}
          >
            <Send size={13} />
            {t("notifications.send")}
          </button>
        }
      />
      <StripeDivider />

      <div className="flex-1 p-6 space-y-6 pb-20 md:pb-6">
        {/* Send form (toggle) */}
        {showForm && (
          <section className="bg-iron border border-steel p-6">
            <SectionHeader label={t("notifications.send")} />
            <SendNotificationForm onSent={handleSent} />
          </section>
        )}

        {/* Notification history */}
        <section>
          <SectionHeader label={t("notifications.title")} />

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-steel border-dashed bg-chevron-pattern">
              <p className="font-display text-[32px] tracking-[0.06em] text-steel leading-none mb-4">
                {t("notifications.noNotifications")}
              </p>
              <p className="text-[13px] text-muted mb-6 max-w-prose">
                {t("notifications.noNotificationsDesc")}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className={cn(
                  "flex items-center gap-2 px-7 h-12",
                  "font-display text-[15px] tracking-widest",
                  "bg-gold text-void clip-corner-sm",
                  "hover:bg-gold-high",
                  "transition-background duration-[120ms]",
                )}
              >
                <Send size={14} />
                {t("notifications.sendFirst")}
              </button>
            </div>
          ) : (
            <div className="space-y-[2px]">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center gap-4 px-5 py-4 bg-iron border border-steel hover:bg-gunmetal transition-colors"
                >
                  {/* Type badge */}
                  <div
                    className={cn(
                      "w-9 h-9 flex items-center justify-center flex-shrink-0 border",
                      typeIcon[n.type] ?? "bg-iron text-muted",
                    )}
                  >
                    <span className="font-display text-[11px] tracking-wider uppercase">
                      {n.type.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-white font-medium truncate">
                      {n.title}
                    </p>
                    <p className="text-[12px] text-muted truncate">{n.message}</p>
                  </div>

                  {/* Audience */}
                  <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-slate hidden md:block">
                    {n.audience}
                  </span>

                  {/* Status */}
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-[0.12em] uppercase",
                      statusColor[n.status] ?? "text-muted",
                    )}
                  >
                    {t(`notifications.${n.status}`)}
                  </span>

                  {/* Date */}
                  <span className="font-mono text-[10px] text-slate hidden md:block whitespace-nowrap">
                    {new Date(n.sent_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
