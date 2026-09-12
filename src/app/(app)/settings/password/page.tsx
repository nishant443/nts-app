import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Password",
};

export default async function PasswordSettingsPage() {
  await requireUser();
  return <ChangePasswordForm />;
}
