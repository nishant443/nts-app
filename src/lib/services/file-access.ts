import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { DocumentOwnerType } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/dal";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fileKeyFromUrl, fileUrlForKey } from "@/lib/storage";

// Business paperwork every employee works with. Employee, expense and payslip
// documents are personal and stay with their owner (and administrators).
const SHARED_OWNER_TYPES: DocumentOwnerType[] = [
  "CUSTOMER",
  "INVOICE",
  "QUOTATION",
  "PURCHASE_ORDER",
];

export function visibleDocumentsWhere(
  user: SessionUser,
): Prisma.DocumentWhereInput {
  if (user.role === "ADMIN") return {};

  return {
    OR: [
      { ownerType: { in: SHARED_OWNER_TYPES } },
      { ownerType: "EMPLOYEE", ownerId: user.id },
      { uploadedById: user.id },
    ],
  };
}

export async function canReadFile(
  user: SessionUser,
  key: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;

  const url = fileUrlForKey(key);

  const [upload, document, expense] = await Promise.all([
    prisma.storedUpload.findFirst({
      where: { key, uploadedById: user.id },
      select: { key: true },
    }),
    prisma.document.findFirst({
      where: { AND: [{ url }, visibleDocumentsWhere(user)] },
      select: { id: true },
    }),
    prisma.expense.findFirst({
      where: { receiptUrl: url, userId: user.id },
      select: { id: true },
    }),
  ]);

  return Boolean(upload || document || expense);
}

// Stops a record from pointing at a file someone else uploaded, which would
// otherwise let a user widen who can read it.
export async function assertOwnUpload(
  user: SessionUser,
  url: string,
  options: { unchanged?: string | null } = {},
): Promise<void> {
  if (options.unchanged && url === options.unchanged) return;

  const key = fileKeyFromUrl(url);
  const upload = key
    ? await prisma.storedUpload.findUnique({
        where: { key },
        select: { uploadedById: true },
      })
    : null;

  if (!upload || upload.uploadedById !== user.id) {
    throw new ForbiddenError("Upload the file again before saving.");
  }
}
