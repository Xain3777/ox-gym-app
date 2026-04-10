import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ── SHARED INPUT BASE STYLES ──────────────────────────────────
const inputBase = [
  "w-full bg-charcoal text-offwhite",
  "border border-steel border-b-slate",
  "font-body text-[14px]",
  "placeholder:text-slate",
  "outline-none",
  "rounded-none",                          // Brand rule: zero radius
  "transition-[border-color,background] duration-[120ms]",
  "focus:border-gold focus:bg-iron",
].join(" ");

// ── INPUT ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:     string;
  hint?:      string;
  error?:     string;
  required?:  boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, required, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            inputBase,
            "h-btn-md px-3.5",
            error && "border-danger focus:border-danger",
            className,
          )}
          {...props}
        />
        {(hint || error) && (
          <p className={cn("text-[11px] mt-1.5", error ? "text-danger" : "text-muted")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

// ── SELECT ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string;
  hint?:     string;
  error?:    string;
  required?: boolean;
  children:  React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, required, className, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            inputBase,
            "h-btn-md px-3.5 cursor-pointer",
            // Custom chevron arrow
            "bg-no-repeat bg-[right_14px_center]",
            error && "border-danger",
            className,
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23555' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          }}
          {...props}
        >
          {children}
        </select>
        {(hint || error) && (
          <p className={cn("text-[11px] mt-1.5", error ? "text-danger" : "text-muted")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

// ── TEXTAREA ──────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:    string;
  hint?:     string;
  error?:    string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, className, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            inputBase,
            "py-3 px-3.5 min-h-[100px] resize-y",
            error && "border-danger",
            className,
          )}
          {...props}
        />
        {(hint || error) && (
          <p className={cn("text-[11px] mt-1.5", error ? "text-danger" : "text-muted")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
