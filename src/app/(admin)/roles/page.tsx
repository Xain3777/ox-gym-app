"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Role = "player" | "coach" | "reception" | "manager";

interface Member {
  id:            string;
  full_name:     string;
  username:      string | null;
  phone:         string | null;
  temp_password: string | null;
  role:          Role;
  status:        string;
}

const ROLES: { key: Role; label: string; color: string }[] = [
  { key: "player",    label: "Player",    color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  { key: "coach",     label: "Coach",     color: "text-green-400 border-green-400/30 bg-green-400/10" },
  { key: "reception", label: "Reception", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
  { key: "manager",   label: "Manager",   color: "text-gold border-gold/30 bg-gold/10" },
];

export default function RolesPage() {
  const [members,  setMembers]  = useState<Member[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Role | "all">("all");
  const [showPass, setShowPass] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => { setMembers(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function changeRole(memberId: string, newRole: Role) {
    setSaving(memberId);
    const res = await fetch(`/api/members/${memberId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
      );
    }
    setSaving(null);
  }

  function togglePass(id: string) {
    setShowPass((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const displayed =
    activeTab === "all" ? members : members.filter((m) => m.role === activeTab);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-[32px] tracking-wider text-white">ROLE MANAGEMENT</h1>
        <p className="text-white/40 text-[13px] mt-1">
          Assign roles to members. Roles control what each user can access.
        </p>
      </div>

      {/* Role category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-4 py-2 text-[13px] font-semibold border transition-all",
            activeTab === "all"
              ? "bg-white/10 border-white/30 text-white"
              : "border-white/10 text-white/40 hover:text-white/60",
          )}
        >
          All ({members.length})
        </button>
        {ROLES.map((r) => {
          const count = members.filter((m) => m.role === r.key).length;
          return (
            <button
              key={r.key}
              onClick={() => setActiveTab(r.key)}
              className={cn(
                "px-4 py-2 text-[13px] font-semibold border transition-all",
                activeTab === r.key
                  ? r.color + " border-current"
                  : "border-white/10 text-white/40 hover:text-white/60",
              )}
            >
              {r.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-white/30 text-[14px] py-12 text-center">Loading members…</div>
      ) : displayed.length === 0 ? (
        <div className="text-white/30 text-[14px] py-12 text-center">No members found.</div>
      ) : (
        <div className="border border-steel overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-steel bg-iron/60">
                <th className="text-left px-4 py-3 text-white/40 font-mono text-[10px] tracking-[0.12em] uppercase">Name</th>
                <th className="text-left px-4 py-3 text-white/40 font-mono text-[10px] tracking-[0.12em] uppercase">Username</th>
                <th className="text-left px-4 py-3 text-white/40 font-mono text-[10px] tracking-[0.12em] uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-white/40 font-mono text-[10px] tracking-[0.12em] uppercase">Password</th>
                <th className="text-left px-4 py-3 text-white/40 font-mono text-[10px] tracking-[0.12em] uppercase">Current Role</th>
                <th className="text-left px-4 py-3 text-white/40 font-mono text-[10px] tracking-[0.12em] uppercase">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((member) => {
                const roleInfo = ROLES.find((r) => r.key === member.role);
                const vis      = showPass.has(member.id);
                return (
                  <tr key={member.id} className="border-b border-steel/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{member.full_name}</td>
                    <td className="px-4 py-3 text-white/60 font-mono">
                      {member.username ?? <span className="text-white/20 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-white/60 font-mono">{member.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {member.temp_password ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white/70">
                            {vis ? member.temp_password : "••••••••"}
                          </span>
                          <button
                            onClick={() => togglePass(member.id)}
                            className="text-white/30 hover:text-white/60 text-[11px] transition-colors"
                          >
                            {vis ? "◉" : "◎"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-white/20 italic text-[12px]">not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 text-[11px] font-bold uppercase border", roleInfo?.color)}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ROLES.filter((r) => r.key !== member.role).map((r) => (
                          <button
                            key={r.key}
                            onClick={() => changeRole(member.id, r.key)}
                            disabled={saving === member.id}
                            className={cn(
                              "px-3 py-1 text-[11px] font-bold uppercase border transition-all",
                              saving === member.id
                                ? "opacity-40 cursor-not-allowed border-white/10 text-white/30"
                                : cn(r.color, "hover:opacity-80"),
                            )}
                          >
                            {saving === member.id ? "…" : r.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
