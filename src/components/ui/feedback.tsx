import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shown when a list has no rows — never a bare "No data". */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent [&_svg]:size-5">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <p className="text-[15px] font-semibold text-fg">{title}</p>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button href={action.href} variant="primary" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Skeleton block. Sized by the caller so the placeholder occupies exactly the
 * space the real content will, keeping cumulative layout shift at zero.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} />;
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Table placeholder matching the real row height, for `loading.tsx`. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      <div className="flex items-center gap-4 px-4 py-2.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="ml-auto h-5 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Inline "something went wrong" panel used by `error.tsx` boundaries. */
export function ErrorPanel({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-danger/25 bg-danger-soft px-6 py-10 text-center">
      <p className="text-[15px] font-semibold text-danger">{title}</p>
      {description && (
        <p className="max-w-md text-[13px] leading-relaxed text-fg-muted">
          {description}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

const calloutTones = {
  warning: {
    box: "border-warning/30 bg-warning-soft",
    title: "text-warning",
  },
  danger: {
    box: "border-danger/30 bg-danger-soft",
    title: "text-danger",
  },
  accent: {
    box: "border-accent/30 bg-accent-soft",
    title: "text-accent",
  },
} as const;

/** Inline notice for a state the reader should know about before acting. */
export function Callout({
  tone = "warning",
  title,
  children,
}: {
  tone?: keyof typeof calloutTones;
  title: string;
  children?: ReactNode;
}) {
  const styles = calloutTones[tone];

  return (
    <div
      role="status"
      className={cn("rounded-xl border px-4 py-3", styles.box)}
    >
      <p
        className={cn(
          "text-[12px] font-semibold uppercase tracking-wide",
          styles.title,
        )}
      >
        {title}
      </p>
      {children && (
        <p className="mt-1 text-[13.5px] leading-relaxed text-fg">{children}</p>
      )}
    </div>
  );
}
