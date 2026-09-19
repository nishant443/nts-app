import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DetailItem {
  label: string;
  value: ReactNode;
  wide?: boolean;
}

export function DetailList({
  items,
  className,
}: {
  items: DetailItem[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("min-w-0", item.wide && "sm:col-span-2")}
        >
          <dt className="text-[12px] font-medium uppercase tracking-wide text-fg-subtle">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-[13.5px] text-fg">
            {item.value || <span className="text-fg-subtle">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
