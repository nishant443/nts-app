"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { action, formAction, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const documentSchema = z.object({
  ownerType: z.enum([
    "CUSTOMER",
    "EMPLOYEE",
    "INVOICE",
    "QUOTATION",
    "PURCHASE_ORDER",
    "EXPENSE",
    "PAYSLIP",
  ]),
  ownerId: z.string().min(1, "Select what this document belongs to."),
  category: z.string().trim().max(60).default("General"),
  name: z.string().trim().min(1, "A name is required.").max(200),
  url: z.string().trim().min(1, "Upload a file first."),
  mimeType: z.string().trim().max(100).optional(),
  sizeBytes: z.coerce.number().int().nonnegative().optional(),
});

export const saveDocument = formAction(
  { access: "user", schema: documentSchema },
  async ({ input, user }) => {
    if (
      input.ownerType === "EMPLOYEE" &&
      input.ownerId !== user.id &&
      user.role !== "ADMIN"
    ) {
      throw new ForbiddenError(
        "You can only upload documents to your own record.",
      );
    }

    const created = await prisma.document.create({
      data: {
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        category: input.category || "General",
        name: input.name,
        url: input.url,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        uploadedById: user.id,
      },
      select: { id: true },
    });

    await recordAudit({
      userId: user.id,
      action: "document.uploaded",
      entity: "Document",
      entityId: created.id,
      meta: { ownerType: input.ownerType, ownerId: input.ownerId },
    });

    revalidatePath("/documents");

    return formSuccess(`${input.name} was added to the library.`);
  },
);

export const deleteDocument = action<{ id: string }>(
  { access: "user" },
  async ({ input, user }) => {
    const document = await prisma.document.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, ownerType: true, ownerId: true, uploadedById: true },
    });

    if (!document) throw new NotFoundError("That document no longer exists.");

    if (user.role !== "ADMIN" && document.uploadedById !== user.id) {
      throw new ForbiddenError("You can only remove documents you uploaded.");
    }

    await prisma.document.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "document.deleted",
      entity: "Document",
      entityId: input.id,
      meta: { name: document.name },
    });

    revalidatePath("/documents");
  },
);
