import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "No access",
};

/**
 * Shown when an employee follows a link to an admin-only page. An explanation
 * is friendlier than a silent bounce to the dashboard, and makes it obvious
 * that the link itself was fine — the permissions were not.
 */
export default async function NoAccessPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
          <ShieldAlert aria-hidden="true" className="size-6" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            You do not have access
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            This area is restricted to administrators. You are signed in as{" "}
            <span className="font-medium text-fg">{user.name}</span>. If you
            think you should have access, ask an administrator to update your
            role.
          </p>
        </div>

        <Button href="/dashboard" variant="primary">
          Back to dashboard
        </Button>
      </div>
    </main>
  );
}
