"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import { formatEmployeeCode } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import {
  employeeCreateSchema,
  employeeUpdateSchema,
  ownProfileSchema,
} from "@/lib/validation";

/**
 * Employee administration.
 *
 * Creating and editing employees is admin-only. `updateOwnProfile` is the
 * employee-facing counterpart and deliberately accepts a much narrower set of
 * fields — an employee cannot change their own role, status, or salary.
 */

/** Next free NTS-00n code. */
async function nextEmployeeCode(): Promise<string> {
  const users = await prisma.user.findMany({ select: { employeeCode: true } });

  const highest = users.reduce((max, user) => {
    const value = Number.parseInt(user.employeeCode.replace(/\D/g, ""), 10);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return formatEmployeeCode(highest + 1);
}

export const createEmployee = formAction(
  { access: "admin", schema: employeeCreateSchema },
  async ({ input, user }) => {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      return formError("An account already uses that email address.", {
        email: ["That email address is already registered."],
      });
    }

    const created = await prisma.user.create({
      data: {
        employeeCode: await nextEmployeeCode(),
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        role: input.role,
        status: "ACTIVE",
        passwordHash: await hashPassword(input.password),
        profile: {
          create: {
            designation: input.designation ?? null,
            department: input.department ?? null,
            employmentType: input.employmentType,
            dateOfJoining: input.dateOfJoining
              ? parseDateInput(input.dateOfJoining)
              : null,
          },
        },
      },
      select: { id: true, employeeCode: true },
    });

    await recordAudit({
      userId: user.id,
      action: "employee.created",
      entity: "User",
      entityId: created.id,
      meta: { name: input.name, role: input.role },
    });

    revalidatePath("/admin/employees");
    redirect(`/admin/employees/${created.id}`);
  },
);

export const updateEmployee = formAction(
  { access: "admin", schema: employeeUpdateSchema },
  async ({ input, user }) => {
    const employee = await prisma.user.findUnique({
      where: { id: input.id },
      select: { id: true, role: true, status: true, email: true },
    });

    if (!employee) throw new NotFoundError("That employee no longer exists.");

    if (input.email !== employee.email) {
      const clash = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (clash) {
        return formError("An account already uses that email address.", {
          email: ["That email address is already registered."],
        });
      }
    }

    // Never let the last administrator lock everyone out of the system.
    if (employee.role === "ADMIN" && input.role !== "ADMIN") {
      const admins = await prisma.user.count({
        where: { role: "ADMIN", status: "ACTIVE", NOT: { id: employee.id } },
      });
      if (admins === 0) {
        return formError(
          "This is the only active administrator. Promote someone else before changing this role.",
          { role: ["At least one administrator is required."] },
        );
      }
    }

    if (employee.role === "ADMIN" && input.status !== "ACTIVE") {
      const admins = await prisma.user.count({
        where: { role: "ADMIN", status: "ACTIVE", NOT: { id: employee.id } },
      });
      if (admins === 0) {
        return formError(
          "This is the only active administrator and cannot be deactivated.",
          { status: ["At least one administrator is required."] },
        );
      }
    }

    await prisma.user.update({
      where: { id: input.id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        role: input.role,
        status: input.status,
        // Deactivating invalidates every session that account holds.
        ...(input.status !== "ACTIVE" && employee.status === "ACTIVE"
          ? { sessionVersion: { increment: 1 } }
          : {}),
        profile: {
          upsert: {
            create: profileData(input),
            update: profileData(input),
          },
        },
      },
    });

    await recordAudit({
      userId: user.id,
      action: "employee.updated",
      entity: "User",
      entityId: input.id,
      meta: { role: input.role, status: input.status },
    });

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${input.id}`);

    return formSuccess("Employee details saved.");
  },
);

function profileData(input: {
  designation?: string;
  department?: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  dateOfJoining?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  uanNumber?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankHolderName?: string;
}) {
  return {
    designation: input.designation ?? null,
    department: input.department ?? null,
    employmentType: input.employmentType,
    dateOfJoining: input.dateOfJoining
      ? parseDateInput(input.dateOfJoining)
      : null,
    dateOfBirth: input.dateOfBirth ? parseDateInput(input.dateOfBirth) : null,
    gender: input.gender ?? null,
    bloodGroup: input.bloodGroup ?? null,
    addressLine1: input.addressLine1 ?? null,
    addressLine2: input.addressLine2 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postalCode: input.postalCode ?? null,
    emergencyContactName: input.emergencyContactName ?? null,
    emergencyContactPhone: input.emergencyContactPhone ?? null,
    panNumber: input.panNumber ?? null,
    aadhaarNumber: input.aadhaarNumber ?? null,
    uanNumber: input.uanNumber ?? null,
    bankName: input.bankName ?? null,
    bankAccountNo: input.bankAccountNo ?? null,
    bankIfsc: input.bankIfsc ?? null,
    bankHolderName: input.bankHolderName ?? null,
  };
}

/** The employee-facing subset: contact, address and bank details only. */
export const updateOwnProfile = formAction(
  { access: "user", schema: ownProfileSchema },
  async ({ input, user }) => {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        phone: input.phone ?? null,
        profile: {
          upsert: {
            create: {
              dateOfBirth: input.dateOfBirth
                ? parseDateInput(input.dateOfBirth)
                : null,
              gender: input.gender ?? null,
              bloodGroup: input.bloodGroup ?? null,
              addressLine1: input.addressLine1 ?? null,
              addressLine2: input.addressLine2 ?? null,
              city: input.city ?? null,
              state: input.state ?? null,
              postalCode: input.postalCode ?? null,
              emergencyContactName: input.emergencyContactName ?? null,
              emergencyContactPhone: input.emergencyContactPhone ?? null,
              bankName: input.bankName ?? null,
              bankAccountNo: input.bankAccountNo ?? null,
              bankIfsc: input.bankIfsc ?? null,
              bankHolderName: input.bankHolderName ?? null,
            },
            update: {
              dateOfBirth: input.dateOfBirth
                ? parseDateInput(input.dateOfBirth)
                : null,
              gender: input.gender ?? null,
              bloodGroup: input.bloodGroup ?? null,
              addressLine1: input.addressLine1 ?? null,
              addressLine2: input.addressLine2 ?? null,
              city: input.city ?? null,
              state: input.state ?? null,
              postalCode: input.postalCode ?? null,
              emergencyContactName: input.emergencyContactName ?? null,
              emergencyContactPhone: input.emergencyContactPhone ?? null,
              bankName: input.bankName ?? null,
              bankAccountNo: input.bankAccountNo ?? null,
              bankIfsc: input.bankIfsc ?? null,
              bankHolderName: input.bankHolderName ?? null,
            },
          },
        },
      },
    });

    await recordAudit({
      userId: user.id,
      action: "profile.updated",
      entity: "User",
      entityId: user.id,
    });

    revalidatePath("/settings/profile");

    return formSuccess("Your profile has been updated.");
  },
);

/**
 * Issues a new temporary password and signs the employee out everywhere. The
 * password is returned once so the admin can pass it on — it is never stored in
 * readable form or emailed.
 */
export const resetEmployeePassword = action<
  { id: string },
  { temporaryPassword: string; name: string }
>(
  { access: "admin" },
  async ({ input, user }) => {
    const employee = await prisma.user.findUnique({
      where: { id: input.id },
      select: { id: true, name: true },
    });

    if (!employee) throw new NotFoundError("That employee no longer exists.");

    const temporary = generateTemporaryPassword();

    await prisma.user.update({
      where: { id: input.id },
      data: {
        passwordHash: await hashPassword(temporary),
        sessionVersion: { increment: 1 },
      },
    });

    await recordAudit({
      userId: user.id,
      action: "employee.password_reset",
      entity: "User",
      entityId: input.id,
      meta: { employee: employee.name },
    });

    // Returned once, for the admin to pass on securely. It is never stored in
    // readable form, emailed, or shown again.
    return { temporaryPassword: temporary, name: employee.name };
  },
);
