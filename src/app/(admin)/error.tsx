"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-danger/10 border border-danger/20 flex items-center justify-center">
          <span className="font-display text-[28px] text-danger">!</span>
        </div>
        <h1 className="font-display text-[36px] text-white tracking-[0.04em] leading-none">
          SOMETHING WENT WRONG
        </h1>
        <p className="text-[13px] text-muted leading-relaxed">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-void font-mono text-[12px] tracking-[0.14em] uppercase font-bold hover:bg-gold/90 transition"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 border border-steel text-muted font-mono text-[12px] tracking-[0.14em] uppercase hover:text-white hover:border-offwhite/30 transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
