"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, X, type LucideIcon } from "lucide-react";

// ── TYPES ──────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "warning";

interface Toast {
  id:       string;
  variant:  ToastVariant;
  title:    string;
  message?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

// ── CONTEXT ───────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── PROVIDER ──────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts]   = useState<Toast[]>([]);
  const timerRefs             = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timerRefs.current[id]);
    delete timerRefs.current[id];
  }, []);

  const toast = useCallback(
    (opts: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { ...opts, id }]); // max 4 at once
      timerRefs.current[id] = setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, message?: string) => toast({ variant: "success", title, message }),
    [toast],
  );
  const error = useCallback(
    (title: string, message?: string) => toast({ variant: "error", title, message }),
    [toast],
  );
  const warning = useCallback(
    (title: string, message?: string) => toast({ variant: "warning", title, message }),
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning }}>
      {children}

      {/* ── TOAST STACK ── */}
      <div
        aria-live="polite"
        className="fixed bottom-20 right-4 z-toast flex flex-col gap-2 md:bottom-6"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── TOAST ITEM ────────────────────────────────────────────────
const variantStyles: Record<ToastVariant, string> = {
  success: "border-l-success  bg-success/10",
  error:   "border-l-danger   bg-danger/10",
  warning: "border-l-gold     bg-gold/5",
};

const variantIcons: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
};

const iconColors: Record<ToastVariant, string> = {
  success: "text-success",
  error:   "text-danger",
  warning: "text-gold",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast:     Toast;
  onDismiss: (id: string) => void;
}) {
  const Icon = variantIcons[toast.variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-[320px] px-4 py-3",
        "bg-charcoal border border-steel border-l-[3px]",
        "animate-slide-in",
        variantStyles[toast.variant],
      )}
      role="alert"
    >
      <Icon
        size={15}
        className={cn("flex-shrink-0 mt-0.5", iconColors[toast.variant])}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white leading-snug">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[12px] text-muted mt-0.5 leading-snug">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-slate hover:text-offwhite transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── HOOK ──────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
