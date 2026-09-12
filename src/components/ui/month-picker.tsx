import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatMonthYear } from "@/lib/dates";

/**
 * Previous / next month navigation driven by the URL, so the view stays a
 * Server Component and a particular month is linkable.
 */
export function MonthPicker({
  month,
  year,
  basePath,
  extraParams,
}: {
  month: number;
  year: number;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const href = (targetMonth: number, targetYear: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("month", String(targetMonth));
    params.set("year", String(targetYear));
    return `${basePath}?${params.toString()}`;
  };

  const previous =
    month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const next =
    month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };

  return (
    <div className="flex items-center gap-1">
      <Link
        href={href(previous.month, previous.year)}
        aria-label="Previous month"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Link>

      <span className="min-w-[9.5rem] text-center text-[13.5px] font-medium text-fg">
        {formatMonthYear(month, year)}
      </span>

      <Link
        href={href(next.month, next.year)}
        aria-label="Next month"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
