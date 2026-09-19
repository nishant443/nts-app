"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, navForRole } from "@/components/layout/nav-config";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = navForRole(role);

  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label="Main">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            {group.label}
          </p>

          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(item, pathname);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium",
                      "transition-[background-color,color] duration-150",
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 h-5 w-0.5 rounded-r-full bg-accent transition-opacity duration-150",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
