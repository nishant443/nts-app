import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  hideOnMobile?: boolean;
  role?: "primary" | "secondary";
  mobileLabel?: string;
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
  empty?: ReactNode;
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

export function columnHelper<T>() {
  return (column: Column<T>): Column<T> => column;
}
