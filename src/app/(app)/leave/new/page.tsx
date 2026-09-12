import type { Metadata } from "next";

import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Request leave",
};

export default async function NewLeavePage() {
  const user = await requireUser();
  const year = today().getUTCFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { userId: user.id, year },
    select: { type: true, allocated: true, used: true },
  });

  return (
    <>
      <PageHeader
        title="Request leave"
        description="Your administrator is notified as soon as you submit."
        breadcrumbs={[{ label: "My leave", href: "/leave" }, { label: "Request" }]}
      />

      <LeaveRequestForm
        defaultDate={dayKey(today())}
        balances={balances.map((balance) => ({
          type: balance.type,
          remaining: Math.max(
            0,
            toMoney(balance.allocated) - toMoney(balance.used),
          ),
        }))}
      />
    </>
  );
}
