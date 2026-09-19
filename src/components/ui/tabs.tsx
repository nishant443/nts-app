import Link from "next/link";

import { cn } from "@/lib/utils";

export function LinkTabs({
  tabs,
  active,
  basePath,
  paramName = "tab",
}: {
  tabs: { value: string; label: string; count?: number }[];
  active: string;
  basePath: string;
  paramName?: string;
}) {
  return (
    <div className="scroll-x border-b border-border">
      <nav
        aria-label="Sections"
        className="flex min-w-max items-center gap-1 px-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === active;

          return (
            <Link
              key={tab.value}
              href={`${basePath}?${paramName}=${tab.value}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "text-accent"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {tab.label}

              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "tnum rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-4",
                    isActive
                      ? "bg-accent text-accent-fg"
                      : "bg-surface-inset text-fg-muted",
                  )}
                >
                  {tab.count}
                </span>
              )}

              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
