"use server";

import { revalidatePath } from "next/cache";

import { action, formAction, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { SETTINGS_ID } from "@/lib/settings";
import { companySettingsSchema, holidaySchema } from "@/lib/validation";

export const saveCompanySettings = formAction(
  { access: "admin", schema: companySettingsSchema },
  async ({ input, user }) => {
    const data = {
      name: input.name,
      tagline: input.tagline ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? "India",
      gstin: input.gstin ?? null,
      pan: input.pan ?? null,
      bankName: input.bankName ?? null,
      bankAccountNo: input.bankAccountNo ?? null,
      bankIfsc: input.bankIfsc ?? null,
      bankBranch: input.bankBranch ?? null,
      bankHolderName: input.bankHolderName ?? null,
      upiId: input.upiId ?? null,
      invoicesPrefix: input.invoicesPrefix,
      quotationPrefix: input.quotationPrefix,
      purchaseOrderPrefix: input.purchaseOrderPrefix,
      defaultTaxRate: input.defaultTaxRate,
      homeState: input.homeState,
    };

    await prisma.companySettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });

    await recordAudit({
      userId: user.id,
      action: "settings.updated",
      entity: "CompanySettings",
      entityId: SETTINGS_ID,
    });

    revalidatePath("/", "layout");

    return formSuccess("Company details saved.");
  },
);

export const addHoliday = formAction(
  { access: "admin", schema: holidaySchema },
  async ({ input, user }) => {
    const date = parseDateInput(input.date);

    await prisma.holiday.upsert({
      where: { date },
      create: { date, name: input.name },
      update: { name: input.name },
    });

    await recordAudit({
      userId: user.id,
      action: "holiday.added",
      entity: "CompanySettings",
      meta: { date: input.date, name: input.name },
    });

    revalidatePath("/settings/holidays");
    revalidatePath("/admin/attendance");

    return formSuccess(`${input.name} added to the holiday calendar.`);
  },
);

export const deleteHoliday = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const holiday = await prisma.holiday.findUnique({
      where: { id: input.id },
      select: { name: true },
    });

    if (!holiday) throw new NotFoundError("That holiday no longer exists.");

    await prisma.holiday.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "holiday.deleted",
      entity: "CompanySettings",
      meta: { name: holiday.name },
    });

    revalidatePath("/settings/holidays");
    revalidatePath("/admin/attendance");
  },
);
