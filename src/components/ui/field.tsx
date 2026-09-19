import type {
  ComponentPropsWithoutRef,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-lg border border-border bg-surface text-fg " +
  "px-3 text-sm shadow-card transition-[border-color,box-shadow] duration-150 " +
  "hover:border-border-strong " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20";

interface FieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string | string[];
  required?: boolean;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
  required,
  className,
}: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-fg-muted"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !message && (
        <p id={`${htmlFor}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}

      {message && (
        <p
          id={`${htmlFor}-error`}
          className="text-xs font-medium text-danger"
          role="alert"
        >
          {message}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "className"> & {
  className?: string;
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(controlBase, "h-10", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type TextareaProps = Omit<ComponentPropsWithoutRef<"textarea">, "className"> & {
  className?: string;
  invalid?: boolean;
};

export function Textarea({ className, invalid, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(controlBase, "resize-y py-2 leading-relaxed", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  className?: string;
  invalid?: boolean;
};

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          controlBase,
          "h-10 cursor-pointer appearance-none pr-9",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "className"> & {
  label: ReactNode;
  className?: string;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer select-none items-start gap-2.5 text-sm text-fg",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border-strong text-accent accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="animate-fade-in rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger"
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="status"
      className="animate-fade-in rounded-lg border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm font-medium text-success"
    >
      {children}
    </div>
  );
}

export function FormGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}
