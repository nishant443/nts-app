import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

export function Pagination({
  page,
  perPage,
  total,
  baseParams,
  className,
}: {
  page: number;
  perPage: number;
  total: number;
  baseParams?: Record<string, string | undefined>;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row",
        className,
      )}
    >
      <p className="tnum text-[13px] text-fg-muted">
        Showing <span className="font-medium text-fg">{from}</span>–
        <span className="font-medium text-fg">{to}</span> of{" "}
        <span className="font-medium text-fg">{total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <PageLink href={hrefFor(1)} disabled={page <= 1} label="First page">
          <ChevronsLeft aria-hidden="true" className="size-4" />
        </PageLink>

        <PageLink
          href={hrefFor(page - 1)}
          disabled={page <= 1}
          label="Previous page"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </PageLink>

        <span className="tnum px-2 text-[13px] text-fg-muted">
          {page} / {totalPages}
        </span>

        <PageLink
          href={hrefFor(page + 1)}
          disabled={page >= totalPages}
          label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </PageLink>

        <PageLink
          href={hrefFor(totalPages)}
          disabled={page >= totalPages}
          label="Last page"
        >
          <ChevronsRight aria-hidden="true" className="size-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const classes =
    "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-[13px] font-medium text-fg transition-colors hover:bg-surface-muted";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(classes, "pointer-events-none opacity-40")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={classes}>
      {children}
    </Link>
  );
}
