import type { Metadata } from "next";

import { OwnProfileForm } from "@/components/settings/own-profile-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DetailList } from "@/components/ui/detail-list";
import { requireUser } from "@/lib/dal";
import { dayKey, formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { humanizeEnum } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My profile",
};

export default async function ProfileSettingsPage() {
  const user = await requireUser();

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  const profile = record?.profile;

  return (
    <>
      {/* Employment terms are set by an administrator, so they are shown
          read-only rather than as editable fields. */}
      <Card>
        <CardHeader
          title="Employment"
          description="Managed by your administrator. Ask them if anything here is wrong."
        />
        <CardBody>
          <DetailList
            items={[
              { label: "Employee code", value: user.employeeCode },
              { label: "Designation", value: profile?.designation },
              { label: "Department", value: profile?.department },
              {
                label: "Employment type",
                value: profile?.employmentType
                  ? humanizeEnum(profile.employmentType)
                  : null,
              },
              {
                label: "Date of joining",
                value: profile?.dateOfJoining
                  ? formatDate(profile.dateOfJoining)
                  : null,
              },
              { label: "Work email", value: user.email },
            ]}
          />
        </CardBody>
      </Card>

      <OwnProfileForm
        values={{
          name: user.name,
          phone: user.phone ?? "",
          dateOfBirth: profile?.dateOfBirth ? dayKey(profile.dateOfBirth) : "",
          gender: profile?.gender ?? "",
          bloodGroup: profile?.bloodGroup ?? "",
          addressLine1: profile?.addressLine1 ?? "",
          addressLine2: profile?.addressLine2 ?? "",
          city: profile?.city ?? "",
          state: profile?.state ?? "",
          postalCode: profile?.postalCode ?? "",
          emergencyContactName: profile?.emergencyContactName ?? "",
          emergencyContactPhone: profile?.emergencyContactPhone ?? "",
          bankName: profile?.bankName ?? "",
          bankAccountNo: profile?.bankAccountNo ?? "",
          bankIfsc: profile?.bankIfsc ?? "",
          bankHolderName: profile?.bankHolderName ?? "",
        }}
      />
    </>
  );
}
