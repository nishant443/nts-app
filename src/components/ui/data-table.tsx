import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The app's one table.
 *
 * Data-dense screens have to work on a phone, so this renders two ways from a
 * single column definition:
 *
 *   ≥ md   a real `<table>` inside a horizontally scrollable container. The
 *          container scrolls, never the page.
 *   < md   a stacked card per row: the `primary` column becomes the heading,
 *          `secondary` the subtitle, and the rest become label/value pairs.
 *
 * Sorting and filtering are URL-driven and handled server-side, so this stays a
 * Server Component with no client JavaScript.
 *
 * `rowHref` makes the whole row (or card) clickable without any JavaScript:
 * the link in the primary cell stretches an empty `::before` across the row,
 * which is positioned against the row because the row is `relative`. There is
 * still exactly one real link per row, so keyboard and screen-reader users get
 * one tab stop and one announcement rather than one per column. A column
 * marked `interactive` is lifted above that overlay so buttons inside it keep
 * working.
 */

export interface Column<T> {
  /** Stable key, also used as the React key. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Extra classes for both the header cell and the body cell. */
  className?: string;
  /** Hide below `md`, e.g. for a secondary timestamp. */
  hideOnMobile?: boolean;
  /** Promote to the card heading / subheading in the mobile layout. */
  role?: "primary" | "secondary";
  /** Header text for the mobile label, when `header` is an icon or empty. */
  mobileLabel?: string;
  /**
   * This cell holds its own controls (a button, a menu, a second link). Keeps
   * them above the row-wide click target so they stay usable.
   */
  interactive?: boolean;
}

const alignments = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Rendered in place of the table when there are no rows. */
  empty?: ReactNode;
  /** Makes the whole desktop row and mobile card open this link. */
  rowHref?: (row: T) => string;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  rowHref,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  const primary = columns.find((column) => column.role === "primary");
  const secondary = columns.find((column) => column.role === "secondary");
  const detailColumns = columns.filter(
    (column) => column.role === undefined && !column.hideOnMobile,
  );

  return (
    <div className={cn("min-w-0", className)}>
      {/* Desktop ------------------------------------------------------- */}
      <div className="scroll-x hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle",
                    alignments[column.align ?? "left"],
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-border/70 transition-colors last:border-0 hover:bg-surface-muted",
                  rowHref && "group/row relative cursor-pointer",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 align-middle text-fg",
                      alignments[column.align ?? "left"],
                      column.interactive && "relative z-10",
                      column.className,
                    )}
                  >
                    {rowHref && column.role === "primary" ? (
                      <a
                        href={rowHref(row)}
                        className="font-medium text-fg before:absolute before:inset-0 before:content-[''] hover:text-accent group-hover/row:underline"
                      >
                        {column.cell(row)}
                      </a>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile -------------------------------------------------------- */}
      <ul className="flex flex-col divide-y divide-border md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className={cn(
              "min-w-0 px-4 py-3.5",
              rowHref && "relative transition-colors active:bg-surface-muted",
            )}
          >
            <div className="flex min-w-0 flex-col gap-2.5">
              {primary && (
                <div className="min-w-0">
                  {rowHref ? (
                    <a
                      href={rowHref(row)}
                      className="block truncate text-[15px] font-semibold text-fg before:absolute before:inset-0 before:content-['']"
                    >
                      {primary.cell(row)}
                    </a>
                  ) : (
                    <div className="truncate text-[15px] font-semibold text-fg">
                      {primary.cell(row)}
                    </div>
                  )}
                  {secondary && (
                    <div className="mt-0.5 truncate text-[13px] text-fg-muted">
                      {secondary.cell(row)}
                    </div>
                  )}
                </div>
              )}

              {detailColumns.length > 0 && (
                <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
                  {detailColumns.map((column) => (
                    <div key={column.key} className="contents">
                      <dt className="text-[12px] uppercase tracking-wide text-fg-subtle">
                        {column.mobileLabel ?? column.header}
                      </dt>
                      <dd
                        className={cn(
                          "min-w-0 text-right text-[13px] text-fg",
                          column.interactive && "relative z-10",
                        )}
                      >
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Column helper that keeps `T` inferred without repeating it at every call
 * site: `const col = columnHelper<Invoice>()`.
 */
export function columnHelper<T>() {
  return (column: Column<T>): Column<T> => column;
}
