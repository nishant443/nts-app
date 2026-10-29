import "server-only";

import { today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

// Lives outside the "use server" actions file on purpose: anything exported
// from there is callable by any client, signed in or not.
export async function refreshOverdueInvoices(): Promise<void> {
  await prisma.invoice.updateMany({
    where: {
      dueDate: { lt: today() },
      status: { in: ["SENT", "PARTIALLY_PAID"] },
    },
    data: { status: "OVERDUE" },
  });
}
