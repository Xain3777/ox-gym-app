"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

// Renders an exercise image (machine photo, demo, or OX comic art).
// Falls back to a clean placeholder if the file is missing — the spec
// says missing images must never crash or block plan saving.
//
// Uses a plain <img> instead of next/image because the paths come from
// runtime DB rows (not statically known at build time), and the
// placeholder needs to swap in synchronously on `onError` without
// next/image's loader pipeline.
export function ExerciseImage({
  src,
  alt,
  className,
  iconSize = 24,
}: {
  src?: string | null;
  alt:  string;
  className?: string;
  iconSize?: number;
}) {
  const [errored, setErrored] = useState(false);
  const useFallback = !src || errored;

  if (useFallback) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-iron border border-steel/40 text-slate",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <Dumbbell size={iconSize} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={cn("object-cover bg-iron", className)}
      loading="lazy"
    />
  );
}
