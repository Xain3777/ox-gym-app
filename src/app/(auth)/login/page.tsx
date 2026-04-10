"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createBrowserSupabase();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (userId) {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const result = await res.json();

      const role = result.data?.role ?? "player";
      const roleHomes: Record<string, string> = {
        manager: "/dashboard",
        coach: "/coach",
        reception: "/reception",
        player: "/portal",
      };
      const destination = roleHomes[role] ?? "/portal";

      window.location.href = destination;
      return;
    }
  }

  return (
    <div className="p-7 sm:p-8">
      <h2 className="font-display text-[30px] tracking-[0.04em] text-white leading-none mb-1">
        {t("auth.signIn")}
      </h2>
      <p className="text-[13px] text-muted mb-8">
        {t("auth.signInDesc")}
      </p>

      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            {t("auth.email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">
            {t("auth.password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-12 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="••••••••"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" fullWidth loading={loading}>
            {t("auth.signIn")}
          </Button>
        </div>
      </form>

      <p className="text-[13px] text-muted mt-8 text-center">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="text-gold hover:text-gold-high transition-colors">
          {t("auth.signUpLink")}
        </Link>
      </p>
    </div>
  );
}
