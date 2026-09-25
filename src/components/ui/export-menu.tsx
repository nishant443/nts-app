"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportMenu({
  basePath,
  query = "",
  label = "Export",
}: {
  basePath: string;
  query?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector("button")?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const href = (format: "xlsx" | "pdf") =>
    `${basePath}?format=${format}${query ? `&${query}` : ""}`;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download aria-hidden="true" />
        {label}
        <ChevronDown aria-hidden="true" className="size-4" />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="animate-pop absolute right-0 z-50 mt-1.5 w-56 origin-top-right overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-overlay"
        >
          <MenuLink
            href={href("xlsx")}
            icon={FileSpreadsheet}
            hint="Spreadsheet with totals"
            onSelect={() => setOpen(false)}
          >
            Excel (.xlsx)
          </MenuLink>
          <MenuLink
            href={href("pdf")}
            icon={FileText}
            hint="Printable document"
            onSelect={() => setOpen(false)}
          >
            PDF
          </MenuLink>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  hint,
  children,
  onSelect,
}: {
  href: string;
  icon: typeof FileText;
  hint: string;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <a
      href={href}
      role="menuitem"
      download
      onClick={onSelect}
      className="flex items-start gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-surface-muted"
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-fg">
          {children}
        </span>
        <span className="block text-[12px] text-fg-muted">{hint}</span>
      </span>
    </a>
  );
}
