"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchHit {
  id: string;
  kind: "customer" | "invoice" | "quotation" | "employee" | "payment";
  title: string;
  subtitle: string;
  href: string;
}

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  customer: "Customer",
  invoice: "Invoice",
  quotation: "Quotation",
  employee: "Employee",
  payment: "Payment",
};

/**
 * Global search.
 *
 * Queries `/api/search`, which scopes results by role on the server — an
 * employee's search never returns an admin-only record. Requests are debounced
 * and the in-flight one is aborted when the query moves on, so fast typing does
 * not queue up work or let a stale response overwrite a newer one.
 */
export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Ctrl/Cmd-K focuses the field from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    // Too short to search: abort anything in flight and stop. The stale hits
    // are filtered out during render rather than cleared here, which would
    // mean a synchronous setState inside an effect.
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startTransition(async () => {
        try {
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(trimmed)}`,
            { signal: controller.signal },
          );
          if (!response.ok) return;
          const data = (await response.json()) as { results: SearchHit[] };
          setHits(data.results);
          setActiveIndex(0);
          setOpen(true);
        } catch {
          // Aborted or offline — leave the previous results in place.
        }
      });
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    setHits([]);
    router.push(hit.href);
  };

  const isSearchable = query.trim().length >= 2;
  const showPanel = open && isSearchable;
  // Results belong to whatever was last searched; suppress them the moment the
  // query becomes too short so a stale list is never shown.
  const visibleHits = isSearchable ? hits : [];

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (visibleHits.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % visibleHits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + visibleHits.length) % visibleHits.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = visibleHits[activeIndex];
      if (hit) go(hit);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 lg:max-w-md">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => visibleHits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search customers, invoices…"
          aria-label="Search"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          role="combobox"
          className={cn(
            "h-9 w-full rounded-lg border border-border bg-surface-inset pl-9 pr-9 text-sm text-fg",
            "transition-[border-color,box-shadow,background-color] duration-150",
            "hover:border-border-strong",
            "focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25",
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />
        {pending && (
          <Loader2
            aria-hidden="true"
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-fg-subtle"
          />
        )}
      </div>

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="animate-pop absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface py-1 shadow-overlay"
        >
          {visibleHits.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-[13px] text-fg-muted">
              {pending ? "Searching…" : `No matches for “${query.trim()}”`}
            </p>
          ) : (
            visibleHits.map((hit, index) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => go(hit)}
                className={cn(
                  "flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors",
                  index === activeIndex ? "bg-surface-muted" : "",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-fg">
                    {hit.title}
                  </span>
                  <span className="block truncate text-[12px] text-fg-muted">
                    {hit.subtitle}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-surface-inset px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-fg-subtle">
                  {KIND_LABEL[hit.kind]}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
