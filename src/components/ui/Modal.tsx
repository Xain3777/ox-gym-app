"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface ModalProps {
  open:        boolean;
  onClose:     () => void;
  title:       string;
  description?: string;
  children:    ReactNode;
  footer?:     ReactNode;
  size?:       "sm" | "md" | "lg";
  className?:  string;
}

const sizeStyles = {
  sm: "max-w-[400px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-modal flex items-end justify-center p-4 md:items-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "w-full bg-charcoal border border-steel",
          "flex flex-col",
          "max-h-[90vh]",
          "animate-fade-up",
          sizeStyles[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-steel flex-shrink-0">
          <div>
            <h2
              id="modal-title"
              className="font-display text-[26px] tracking-[0.04em] text-white leading-none"
            >
              {title}
            </h2>
            {description && (
              <p className="text-[13px] text-muted mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate hover:text-offwhite transition-colors ml-4 flex-shrink-0 mt-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-steel bg-iron">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
