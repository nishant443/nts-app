import {
  BadgeIndianRupee,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  Receipt,
  ScrollText,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Wallet2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Role } from "@/generated/prisma/enums";

/**
 * Navigation is data, not markup — the sidebar and the mobile drawer render
 * from this same list.
 *
 * `adminOnly` hides an entry from employees. That is presentation only: the
 * pages themselves call `requireAdmin()`, so hiding a link is never what keeps
 * anyone out.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Match nested routes too, e.g. /customers/abc highlights "Customers". */
  matchPrefix?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "My workspace",
    items: [
      { label: "Tasks", href: "/tasks", icon: ListChecks, matchPrefix: true },
      {
        label: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
        matchPrefix: true,
      },
      {
        label: "Daily work",
        href: "/work-logs",
        icon: ClipboardList,
        matchPrefix: true,
      },
      { label: "Expenses", href: "/expenses", icon: Wallet, matchPrefix: true },
      { label: "Leave", href: "/leave", icon: ScrollText, matchPrefix: true },
      {
        label: "Payslips",
        href: "/payslips",
        icon: BadgeIndianRupee,
        matchPrefix: true,
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: "Customers",
        href: "/customers",
        icon: Building2,
        matchPrefix: true,
      },
      {
        label: "Quotations",
        href: "/quotations",
        icon: FileText,
        matchPrefix: true,
      },
      {
        label: "Invoices",
        href: "/invoices",
        icon: Receipt,
        matchPrefix: true,
      },
      {
        label: "Payments",
        href: "/payments",
        icon: Wallet2,
        matchPrefix: true,
      },
      {
        label: "Purchase orders",
        href: "/purchase-orders",
        icon: ShoppingCart,
        matchPrefix: true,
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FolderOpen,
        matchPrefix: true,
      },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    items: [
      {
        label: "Employees",
        href: "/admin/employees",
        icon: Users,
        adminOnly: true,
        matchPrefix: true,
      },
      {
        label: "Attendance register",
        href: "/admin/attendance",
        icon: CalendarCheck,
        adminOnly: true,
        matchPrefix: true,
      },
      {
        label: "Approvals",
        href: "/admin/approvals",
        icon: ClipboardList,
        adminOnly: true,
        matchPrefix: true,
      },
      {
        label: "Payroll",
        href: "/admin/payroll",
        icon: BadgeIndianRupee,
        adminOnly: true,
        matchPrefix: true,
      },
      {
        label: "Reports",
        href: "/reports",
        icon: FileSpreadsheet,
        adminOnly: true,
        matchPrefix: true,
      },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, matchPrefix: true },
    ],
  },
];

/** Strips entries the given role must not see. */
export function navForRole(role: Role): NavGroup[] {
  const isAdmin = role === "ADMIN";

  return NAV_GROUPS.filter((group) => isAdmin || !group.adminOnly)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isAdmin || !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0);
}

/** Whether `href` should render as the active nav entry for `pathname`. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (!item.matchPrefix) return false;
  return pathname.startsWith(`${item.href}/`);
}
