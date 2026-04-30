import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Send, Mail, Phone, Calendar, Shield, Target, Flame } from "lucide-react";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, SectionHeader, StripeDivider } from "@/components/layout/TopBar";
import { Card, CardBody, CardLabel } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import {
  getMemberStatus,
  daysUntil,
  formatDate,
  formatCurrency,
  cn,
} from "@/lib/utils";
import type { MemberWithSub, PlanSend } from "@/types";

// ── METADATA ─────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("members")
      .select("full_name")
      .eq("id", params.id)
      .single();
    return { title: data?.full_name ?? "Member" };
  } catch {
    return { title: "Member" };
  }
}

// ── DATA ──────────────────────────────────────────────────────
async function getMember(id: string): Promise<{
  member:    MemberWithSub;
  planSends: (PlanSend & { plan_name: string })[];
}> {
  try {
    const supabase = createServiceClient();

    const { data: member, error } = await supabase
      .from("members")
      .select("*, subscription:subscriptions(*)")
      .eq("id", id)
      .single();

    if (error || !member) notFound();

    // Normalise subscription array
    const memberWithSub: MemberWithSub = {
      ...member,
      subscription: Array.isArray(member.subscription)
        ? member.subscription[0] ?? null
        : member.subscription,
    };

    // Fetch plan send history
    const { data: sends } = await supabase
      .from("plan_sends")
      .select("*")
      .eq("member_id", id)
      .order("sent_at", { ascending: false })
      .limit(10);

    // Enrich sends with plan names
    const enriched = await Promise.all(
      (sends ?? []).map(async (send) => {
        try {
          const table = send.plan_type === "workout" ? "workout_plans" : "meal_plans";
          const { data: plan } = await supabase
            .from(table)
            .select("name")
            .eq("id", send.plan_id)
            .single();
          return { ...send, plan_name: plan?.name ?? "Unknown plan" };
        } catch {
          return { ...send, plan_name: "Unknown plan" };
        }
      }),
    );

    return { member: memberWithSub, planSends: enriched };
  } catch (error) {
    console.error("Failed to fetch member:", error);
    notFound();
  }
}

// ── PAGE ──────────────────────────────────────────────────────
export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { member, planSends } = await getMember(params.id);
  const sub    = member.subscription;
  const status = getMemberStatus(sub?.end_date ?? null);
  const days   = sub?.end_date ? daysUntil(sub.end_date) : null;

  return (
    <div className="flex flex-col min-h-full">

      {/* ── TOP BAR ── */}
      <TopBar
        title={member.full_name.toUpperCase()}
        eyebrow="Members"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/members"
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted hover:text-offwhite transition-colors"
            >
              <ArrowLeft size={12} />
              Back
            </Link>
            <Link href={`/plans/send?member=${member.id}`}>
              <Button size="sm">
                <Send size={13} />
                Send Plan
              </Button>
            </Link>
          </div>
        }
      />
      <StripeDivider thin />

      <div className="flex-1 p-6 pb-20 md:pb-6 space-y-6 max-w-[900px]">

        {/* ── EXPIRY ALERT ── */}
        {status === "expiring" && days !== null && (
          <Alert
            variant="warning"
            title={`Membership expires in ${days} day${days !== 1 ? "s" : ""}`}
            description={`End date: ${formatDate(sub!.end_date)}. Consider sending a reminder or renewing.`}
          />
        )}
        {status === "expired" && (
          <Alert
            variant="danger"
            title="Membership has expired"
            description={`Expired on ${sub?.end_date ? formatDate(sub.end_date) : "unknown date"}.`}
          />
        )}

        {/* ── PROFILE CARD ── */}
        <Card>
          <CardBody className="flex items-start gap-5">
            <Avatar
              name={member.full_name}
              photoUrl={member.photo_url}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-[28px] tracking-[0.04em] text-white leading-none mb-1">
                    {member.full_name}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <StatusBadge status={status} />
                    {member.level && (
                      <LevelBadge level={member.level} />
                    )}
                    {sub && (
                      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">
                        {sub.plan_type} plan
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="mt-4 space-y-1.5">
                {member.phone && (
                  <ContactRow icon={<Phone size={12} />} value={member.phone} />
                )}
                {member.username && (
                  <ContactRow icon={<Mail size={12} />} value={member.username} />
                )}
                <ContactRow
                  icon={<Calendar size={12} />}
                  value={`Member since ${formatDate(member.created_at)}`}
                />
              </div>

              {/* Goals */}
              {member.goals && (
                <div className="mt-4 p-3 bg-iron border-l-2 border-steel">
                  <CardLabel className="mb-1">Goals</CardLabel>
                  <p className="text-[13px] text-offwhite/75 leading-relaxed">
                    {member.goals}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── SUBSCRIPTION CARD ── */}
        <div>
          <SectionHeader label="Subscription" />
          {sub ? (
            <Card variant="accent">
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <SubStat label="Plan"      value={sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)} />
                  <SubStat label="Start"     value={formatDate(sub.start_date)} />
                  <SubStat
                    label="Expires"
                    value={formatDate(sub.end_date)}
                    highlight={status === "expiring" ? "gold" : status === "expired" ? "red" : undefined}
                  />
                  <SubStat
                    label="Days Left"
                    value={days !== null && days >= 0 ? `${days}d` : "Expired"}
                    highlight={days !== null && days < 0 ? "red" : days !== null && days <= 7 ? "gold" : undefined}
                  />
                </div>
                {sub.price && (
                  <div className="mt-4 pt-4 border-t border-steel">
                    <CardLabel className="mb-1">Price</CardLabel>
                    <p className="text-[14px] font-semibold text-white">
                      {formatCurrency(sub.price)}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <p className="text-[13px] text-muted py-4">No active subscription.</p>
          )}
        </div>

        {/* ── PLAN SEND HISTORY ── */}
        <div>
          <SectionHeader label="Plans Sent">
            <Link href={`/plans/send?member=${member.id}`}>
              <Button size="sm" variant="secondary">
                <Send size={12} />
                Send Plan
              </Button>
            </Link>
          </SectionHeader>

          {planSends.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-display text-[22px] tracking-[0.05em] text-steel mb-2">
                NO PLANS SENT YET
              </p>
              <p className="text-[13px] text-muted">
                Send this member their first workout plan.
              </p>
            </Card>
          ) : (
            <div className="space-y-[2px]">
              {planSends.map((send) => (
                <div
                  key={send.id}
                  className="flex items-center gap-4 px-5 py-3 bg-iron border border-steel"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">
                      {send.plan_name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {send.plan_type === "workout" ? "Workout" : "Meal"} plan ·{" "}
                      Sent by {send.sent_by}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-muted">{formatDate(send.sent_at)}</p>
                    <span
                      className={cn(
                        "text-[9px] font-mono uppercase tracking-[0.1em]",
                        send.status === "sent" ? "text-success" : "text-danger",
                      )}
                    >
                      {send.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── HELPERS ───────────────────────────────────────────────────
function ContactRow({
  icon,
  value,
}: {
  icon:  React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted">
      <span className="text-slate">{icon}</span>
      {value}
    </div>
  );
}

function SubStat({
  label,
  value,
  highlight,
}: {
  label:      string;
  value:      string;
  highlight?: "gold" | "red";
}) {
  return (
    <div>
      <CardLabel className="mb-1">{label}</CardLabel>
      <p
        className={cn(
          "text-[14px] font-semibold",
          highlight === "gold" ? "text-gold"   :
          highlight === "red"  ? "text-danger" :
          "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    beginner:     { label: "Beginner",     icon: Shield, color: "text-success",  bg: "bg-success/10 border-success/20" },
    intermediate: { label: "Intermediate", icon: Target, color: "text-gold",     bg: "bg-gold/10 border-gold/20" },
    advanced:     { label: "Advanced",     icon: Flame,  color: "text-danger",   bg: "bg-danger/10 border-danger/20" },
  };
  const c = config[level] ?? config.beginner;
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 border font-mono text-[9px] uppercase tracking-wider", c.bg, c.color)}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}
