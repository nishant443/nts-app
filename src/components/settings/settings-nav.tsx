"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  KeyRound,
  Palette,
  User,
} from "lucide-react";

import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/settings", label: "Appearance", icon: Palette, exact: true },
  { href: "/settings/profile", label: "My profile", icon: User },
  { href: "/settings/password", label: "Password", icon: KeyRound },
  {
    href: "/settings/company",
    label: "Company",
    icon: Building2,
    adminOnly: true,
  },
  {
    href: "/settings/holidays",
    label: "Holidays",
    icon: CalendarDays,
    adminOnly: true,
  },
];

export function SettingsNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const sections = SECTIONS.filter(
    (section) => role === "ADMIN" || !section.adminOnly,
  );

  return (
    <nav aria-label="Settings sections" className="min-w-0">
      <ul className="scroll-x flex gap-1 lg:flex-col lg:gap-0.5">
        {sections.map((section) => {
          const active = section.exact
            ? pathname === section.href
            : pathname.startsWith(section.href);
          const Icon = section.icon;

          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
