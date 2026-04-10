import type { Metadata } from "next";
import Image from "next/image";
import { TopBar, StripeDivider } from "@/components/layout/TopBar";
import { Card, CardBody, CardLabel } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="SETTINGS" eyebrow="System" />
      <StripeDivider thin />

      <div className="flex-1 p-6 pb-20 md:pb-6 max-w-[680px] space-y-6">

        {/* Reminder config */}
        <Card variant="accent">
          <CardBody>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-gold mb-4">
              Reminder Schedule
            </p>
            <div className="space-y-3">
              {[
                { label: "7-day expiry reminder", value: "Active — sent at 08:00 UTC" },
                { label: "3-day expiry reminder", value: "Active — sent at 08:00 UTC" },
                { label: "Auto-expire members",   value: "Active — runs daily" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-steel last:border-0">
                  <p className="text-[13px] text-offwhite">{label}</p>
                  <p className="font-mono text-[10px] text-success">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-muted mt-4">
              Cron schedule is configured in <code className="text-gold text-[11px]">vercel.json</code>.
              Timing adjustments require redeployment.
            </p>
          </CardBody>
        </Card>

        {/* Environment check */}
        <Card variant="accent">
          <CardBody>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-gold mb-4">
              Environment
            </p>
            <div className="space-y-2">
              {[
                { key: "NEXT_PUBLIC_SUPABASE_URL",     required: true  },
                { key: "SUPABASE_SERVICE_ROLE_KEY",    required: true  },
                { key: "RESEND_API_KEY",               required: true  },
                { key: "EMAIL_FROM",                   required: true  },
                { key: "CRON_SECRET",                  required: true  },
                { key: "NEXT_PUBLIC_APP_URL",          required: false },
              ].map(({ key, required }) => (
                <div key={key} className="flex items-center justify-between">
                  <code className="font-mono text-[11px] text-gold">{key}</code>
                  <span className={`font-mono text-[9px] uppercase tracking-[0.1em] ${required ? "text-muted" : "text-slate"}`}>
                    {required ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* About */}
        <div className="text-center py-6 flex flex-col items-center">
          <Image
            src="/ox-logo.png"
            alt="OX GYM"
            width={48}
            height={48}
            className="mb-2"
          />
          <p className="font-display text-[22px] tracking-[0.06em] text-gold">GYM</p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted mt-1">
            HARDER · BETTER · FASTER · STRONGER
          </p>
          <p className="text-[11px] text-steel mt-3">v0.1.0 — MVP</p>
        </div>

      </div>
    </div>
  );
}
