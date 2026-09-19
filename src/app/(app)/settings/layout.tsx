import type { ReactNode } from "react";

import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, and how the app works for everyone."
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SettingsNav role={user.role} />
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </>
  );
}
