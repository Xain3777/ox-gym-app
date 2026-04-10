import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, SectionHeader } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { MemberRow } from "@/components/admin/MemberRow";
import { getMemberStatus } from "@/lib/utils";
import type { MemberWithSub, MemberStatus } from "@/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Members" };

// ── DATA ──────────────────────────────────────────────────────
async function getMembers(): Promise<MemberWithSub[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("members")
      .select("*, subscription:subscriptions(*)")
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data ?? []).map((m) => ({
      ...m,
      subscription: Array.isArray(m.subscription) ? m.subscription[0] ?? null : m.subscription,
    })) as MemberWithSub[];
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return [];
  }
}

// ── PAGE ──────────────────────────────────────────────────────
export default async function MembersPage({
  searchParams,
}: {
  searchParams: { filter?: string; q?: string };
}) {
  const allMembers = await getMembers();
  const filter = (searchParams.filter ?? "all") as MemberStatus | "all";
  const query  = searchParams.q?.toLowerCase() ?? "";

  // Filter by status
  const filtered = allMembers.filter((m) => {
    const status = getMemberStatus(m.subscription?.end_date ?? null);
    const matchesFilter = filter === "all" || status === filter;
    const matchesQuery  =
      !query ||
      m.full_name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  const tabs: { label: string; value: MemberStatus | "all"; count: number }[] = [
    { label: "All",      value: "all",      count: allMembers.length },
    {
      label: "Active",
      value: "active",
      count: allMembers.filter((m) => getMemberStatus(m.subscription?.end_date ?? null) === "active").length,
    },
    {
      label: "Expiring",
      value: "expiring",
      count: allMembers.filter((m) => getMemberStatus(m.subscription?.end_date ?? null) === "expiring").length,
    },
    {
      label: "Expired",
      value: "expired",
      count: allMembers.filter((m) => getMemberStatus(m.subscription?.end_date ?? null) === "expired").length,
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="MEMBERS"
        eyebrow={`${allMembers.length} total`}
        actions={
          <Link href="/members/new">
            <Button size="sm">
              <Plus size={13} />
              Add Member
            </Button>
          </Link>
        }
      />

      <div className="p-6 pb-20 md:pb-6 space-y-5 flex-1">

        {/* ── FILTER TABS ── */}
        <div className="flex gap-0 border-b border-steel">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/members${tab.value !== "all" ? `?filter=${tab.value}` : ""}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5",
                "font-mono text-[10px] tracking-[0.12em] uppercase",
                "border-b-2 -mb-px transition-colors duration-[120ms]",
                filter === tab.value
                  ? "text-gold border-b-gold"
                  : "text-muted border-b-transparent hover:text-offwhite",
              )}
            >
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 text-[9px]",
                filter === tab.value
                  ? "bg-gold/10 text-gold"
                  : "bg-steel/40 text-muted",
              )}>
                {tab.count}
              </span>
            </Link>
          ))}
        </div>

        {/* ── MEMBER LIST ── */}
        {filtered.length === 0 ? (
          <p className="text-muted text-[13px] py-12 text-center">
            No members match this filter.
          </p>
        ) : (
          <div className="space-y-[2px]">
            {filtered.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
