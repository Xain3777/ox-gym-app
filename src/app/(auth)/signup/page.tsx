"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Create user + member via server API (bypasses RLS)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        phone: phone || null,
      }),
    });

    const result = await res.json();

    if (!result.success) {
      setError(result.error ?? "Signup failed");
      setLoading(false);
      return;
    }

    // 2. Sign in client-side to establish the session cookie
    const supabase = createBrowserSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // 3. Hard navigate so middleware picks up new session cookie
    window.location.href = "/portal";
    return;
  }

  return (
    <div className="p-6">
      <h2 className="font-display text-[28px] tracking-[0.04em] text-white leading-none mb-1">
        CREATE ACCOUNT
      </h2>
      <p className="text-[13px] text-muted mb-6">
        Join OX GYM and start your fitness journey.
      </p>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-[13px] px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full h-11 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="Ahmed Khalil"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
            Phone (optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-11 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="+966 5XX XXX XXX"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted block mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-11 px-4 bg-iron border border-steel text-offwhite text-[14px] placeholder:text-slate focus:border-gold focus:outline-none transition-colors"
            placeholder="Min 6 characters"
          />
        </div>

        <Button type="submit" fullWidth loading={loading}>
          CREATE ACCOUNT
        </Button>
      </form>

      <p className="text-[13px] text-muted mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-gold hover:text-gold-high transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
