"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

/**
 * Account dropdown. Closes on outside click, Escape, and route change; focus
 * returns to the trigger so keyboard users are not stranded.
 */
export function UserMenu({
  name,
  email,
  role,
  avatarUrl,
}: {
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        triggerRef.current?.focus();
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

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-muted"
      >
        <Avatar name={name} src={avatarUrl} size="sm" />
        <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
          <span className="max-w-[10rem] truncate text-[13px] font-medium text-fg">
            {name}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-fg-subtle transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="animate-pop absolute right-0 z-50 mt-1.5 w-64 origin-top-right overflow-hidden rounded-xl border border-border bg-surface shadow-overlay"
        >
          <div className="flex items-center gap-3 border-b border-border px-3.5 py-3">
            <Avatar name={name} src={avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{name}</p>
              <p className="truncate text-[12.5px] text-fg-muted">{email}</p>
            </div>
          </div>

          <div className="px-3.5 py-2">
            <Badge tone={role === "ADMIN" ? "accent" : "neutral"}>
              {role === "ADMIN" ? "Administrator" : "Employee"}
            </Badge>
          </div>

          <div className="border-t border-border py-1">
            <MenuLink href="/settings/profile" icon={User} onSelect={() => setOpen(false)}>
              My profile
            </MenuLink>
            <MenuLink href="/settings" icon={Settings} onSelect={() => setOpen(false)}>
              Settings
            </MenuLink>
          </div>

          <form action={signOut} className="border-t border-border py-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onSelect,
}: {
  href: string;
  icon: typeof User;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
    >
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
