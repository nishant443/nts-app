import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "accent" | "success" | "warning" | "danger";

const iconTones: Record<StatTone, string> = {
  neutral: "bg-surface-inset text-fg-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  trend,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  trend?: { value: number; label: string };
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-fg-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
              iconTones[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="tnum mt-2 truncate text-[22px] font-semibold tracking-tight text-fg sm:text-[26px]">
        {value}
      </p>

      {(hint || trend) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          {trend && <TrendPill value={trend.value} label={trend.label} />}
          {hint && <span className="text-fg-subtle">{hint}</span>}
        </div>
      )}
    </>
  );

  const classes = cn(
    "min-w-0 rounded-xl border border-border bg-surface p-4 shadow-card",
    href &&
      "transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}

function TrendPill({ value, label }: { value: number; label: string }) {
  const flat = Math.abs(value) < 0.05;
  const positive = value > 0;

  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        flat ? "text-fg-subtle" : positive ? "text-success" : "text-danger",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="tnum">
        {flat ? "0%" : `${Math.abs(value).toFixed(1)}%`}
      </span>
      <span className="font-normal text-fg-subtle">{label}</span>
    </span>
  );
}

export function StatGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
