"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectFilter {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}

export function FilterBar({
  searchPlaceholder = "Search…",
  searchName = "q",
  showSearch = true,
  selects = [],
  dateRange = false,
  className,
  children,
}: {
  searchPlaceholder?: string;
  searchName?: string;
  showSearch?: boolean;
  selects?: SelectFilter[];
  dateRange?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [term, setTerm] = useState(searchParams.get(searchName) ?? "");
  const firstRender = useRef(true);

  const push = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      push((params) => {
        if (term.trim()) params.set(searchName, term.trim());
        else params.delete(searchName);
      });
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const setParam = (name: string, value: string) => {
    push((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
    });
  };

  const activeCount =
    [...searchParams.keys()].filter((key) => key !== "page").length;

  const clearAll = () => {
    setTerm("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 border-b border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {showSearch && (
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-8 text-sm text-fg transition-[border-color,box-shadow] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {pending && (
            <Loader2
              aria-hidden="true"
              className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-fg-subtle"
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {selects.map((filter) => (
          <select
            key={filter.name}
            aria-label={filter.label}
            value={searchParams.get(filter.name) ?? ""}
            onChange={(event) => setParam(filter.name, event.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-border bg-surface px-2.5 pr-7 text-[13px] text-fg transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          >
            <option value="">{filter.allLabel ?? `All ${filter.label.toLowerCase()}`}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {dateRange && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="From date"
              value={searchParams.get("from") ?? ""}
              onChange={(event) => setParam("from", event.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-fg transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <span className="text-[13px] text-fg-subtle">to</span>
            <input
              type="date"
              aria-label="To date"
              value={searchParams.get("to") ?? ""}
              onChange={(event) => setParam("to", event.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-fg transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
        )}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-2 sm:ml-auto">{children}</div>
      )}
    </div>
  );
}
