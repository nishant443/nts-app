import type { Metadata } from "next";

import { ThemeSelector } from "@/components/layout/theme";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DetailList } from "@/components/ui/detail-list";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AppearanceSettingsPage() {
  const user = await requireUser();

  return (
    <>
      <Card>
        <CardHeader
          title="Appearance"
          description="Applies to this browser only."
        />
        <CardBody className="flex flex-col gap-3">
          <ThemeSelector />
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            &ldquo;System&rdquo; follows your device setting and switches
            automatically.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Signed in as" />
        <CardBody>
          <DetailList
            items={[
              { label: "Name", value: user.name },
              { label: "Employee code", value: user.employeeCode },
              { label: "Email", value: user.email },
              {
                label: "Access level",
                value:
                  user.role === "ADMIN" ? "Administrator" : "Employee",
              },
            ]}
          />
        </CardBody>
      </Card>
    </>
  );
}
