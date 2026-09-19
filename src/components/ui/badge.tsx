import type { ReactNode } from "react";

import { cn, humanizeEnum } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-inset text-fg-muted ring-border",
  accent: "bg-accent-soft text-accent ring-accent/20",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5",
        "text-[11.5px] font-medium leading-5 ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current opacity-70"
        />
      )}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  SUBMITTED: "info",
  DRAFT: "neutral",
  REIMBURSED: "success",

  OPEN: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",

  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "danger",

  PRESENT: "success",
  ABSENT: "danger",
  HALF_DAY: "warning",
  ON_LEAVE: "info",
  HOLIDAY: "accent",
  WEEK_OFF: "neutral",

  PROCESSING: "info",
  FINALIZED: "accent",
  PAID: "success",

  SENT: "info",
  ACCEPTED: "success",
  EXPIRED: "neutral",
  CONVERTED: "accent",
  PARTIALLY_PAID: "warning",
  OVERDUE: "danger",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  FAILED: "danger",

  LEAD: "info",
  VENDOR: "accent",

  ADMIN: "accent",
  EMPLOYEE: "neutral",
};

export function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <Badge
      tone={STATUS_TONES[status] ?? "neutral"}
      className={className}
      dot={dot}
    >
      {humanizeEnum(status)}
    </Badge>
  );
}
