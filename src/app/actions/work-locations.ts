"use server";

import { revalidatePath } from "next/cache";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { formatDate, parseDateInput } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError, NotFoundError } from "@/lib/errors";
import { isMailConfigured, notificationEmail, sendMail } from "@/lib/mail";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { RateLimits } from "@/lib/rate-limit";
import { getCompanySettings } from "@/lib/settings";
import { workLocationSchema } from "@/lib/validation";

/**
 * Work locations — where each employee is expected to check in from.
 *
 * An entry is "the location from this day onwards": later days inherit it
 * until a newer entry is recorded, so the admin only writes one when the site
 * changes. Saving the same employee + date again replaces that entry.
 *
 * Saving never emails on its own — the employee gets the in-app notification,
 * and the admin sends the email deliberately (the checkbox on the form, or the
 * Email button on the page). Back-dated entries and corrections would
 * otherwise fire confusing mail about days already gone.
 */

/** The one email for a location entry; used by both the form and the button. */
async function emailLocation(
  location: {
    id: string;
    date: Date;
    label: string;
    radiusMeters: number;
    notes: string | null;
    user: { name: string; email: string; status: string };
  },
  senderEmail: string,
): Promise<void> {
  if (!isMailConfigured()) {
    throw new AppError(
      "Email has not been set up. Add the SMTP settings, then try again.",
    );
  }
  if (location.user.status !== "ACTIVE") {
    throw new AppError("This employee's account is not active.");
  }

  const settings = await getCompanySettings();
  const { subject, text, html } = notificationEmail({
    recipientName: location.user.name,
    category: "Work location",
    title: `${location.label} — from ${formatDate(location.date)}`,
    body: `Check in and out from within ${location.radiusMeters} m of ${location.label}.${location.notes ? ` ${location.notes}` : ""}`,
    link: `${env.NEXT_PUBLIC_APP_URL}/attendance`,
    companyName: settings.name,
  });
  await sendMail({
    to: location.user.email,
    subject,
    text,
    html,
    replyTo: senderEmail,
  });

  await prisma.workLocation.update({
    where: { id: location.id },
    data: { emailedAt: new Date() },
  });
}

const locationForEmail = {
  id: true,
  date: true,
  label: true,
  radiusMeters: true,
  notes: true,
  user: { select: { name: true, email: true, status: true } },
} as const;

export const setWorkLocation = formAction(
  { access: "admin", schema: workLocationSchema },
  async ({ input, user }) => {
    const date = parseDateInput(input.date);

    const employee = await prisma.user.findUnique({
      where: { id: input.userId, status: "ACTIVE" },
      select: { id: true, name: true },
    });
    if (!employee) {
      return formError("That employee could not be found.", {
        userId: ["Choose an active employee."],
      });
    }

    const data = {
      label: input.label,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: Math.round(input.radiusMeters),
      notes: input.notes ?? null,
      setById: user.id,
    };

    const location = await prisma.workLocation.upsert({
      where: { userId_date: { userId: employee.id, date } },
      create: { userId: employee.id, date, ...data },
      update: data,
      select: locationForEmail,
    });

    await recordAudit({
      userId: user.id,
      action: "work_location.set",
      entity: "WorkLocation",
      entityId: location.id,
      meta: {
        employeeId: employee.id,
        date: input.date,
        label: input.label,
        radiusMeters: data.radiusMeters,
      },
    });

    // In-app only; email is the admin's call.
    await notify({
      userId: employee.id,
      type: "WORK_LOCATION_SET",
      title: `${input.label} — from ${formatDate(date)}`,
      body: `Check in and out from within ${data.radiusMeters} m of ${input.label}.${input.notes ? ` ${input.notes}` : ""}`,
      link: "/attendance",
      email: false,
    });

    let emailNote = "";
    if (input.emailEmployee) {
      try {
        await emailLocation(location, user.email);
        emailNote = ` Emailed to ${location.user.email}.`;
      } catch (error) {
        emailNote = ` Email not sent: ${error instanceof Error ? error.message : "unknown error"}`;
      }
    }

    revalidatePath("/admin/locations");
    revalidatePath("/attendance");
    revalidatePath("/dashboard");

    return formSuccess(
      `${employee.name}'s location from ${formatDate(date)} is ${input.label}.${emailNote}`,
    );
  },
);

/** Admin presses Email on the page — the only other way a location is mailed. */
export const emailWorkLocation = action<{ id: string }, { sentTo: string }>(
  { access: "admin", rateLimit: RateLimits.export },
  async ({ input, user }) => {
    const location = await prisma.workLocation.findUnique({
      where: { id: input.id },
      select: locationForEmail,
    });
    if (!location) throw new NotFoundError("That location no longer exists.");

    await emailLocation(location, user.email);

    await recordAudit({
      userId: user.id,
      action: "work_location.emailed",
      entity: "WorkLocation",
      entityId: location.id,
      meta: { to: location.user.email },
    });

    revalidatePath("/admin/locations");
    return { sentTo: location.user.email };
  },
);

export const deleteWorkLocation = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const location = await prisma.workLocation.findUnique({
      where: { id: input.id },
      select: { id: true, userId: true, date: true, label: true },
    });
    if (!location) throw new NotFoundError("That location no longer exists.");

    await prisma.workLocation.delete({ where: { id: location.id } });

    await recordAudit({
      userId: user.id,
      action: "work_location.deleted",
      entity: "WorkLocation",
      entityId: location.id,
      meta: {
        employeeId: location.userId,
        date: location.date.toISOString(),
        label: location.label,
      },
    });

    revalidatePath("/admin/locations");
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
  },
);
