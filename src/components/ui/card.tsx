import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={cn(
        "min-w-0 rounded-xl border border-border bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold text-fg">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={cn(padded && "p-4 sm:p-5", "min-w-0", className)}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
