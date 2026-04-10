"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
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
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-void font-mono text-[12px] tracking-[0.14em] uppercase font-bold hover:bg-gold/90 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
