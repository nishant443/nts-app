import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/dal";

/**
 * Shell for every signed-in route.
 *
 * The user is loaded here because the chrome needs it. This is *not* the
 * security boundary: layouts do not re-render on client-side navigation, so
 * each page independently calls `requireUser()` / `requireAdmin()` through the
 * DAL before touching data.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
