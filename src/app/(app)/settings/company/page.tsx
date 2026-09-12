import type { Metadata } from "next";

import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { requireAdmin } from "@/lib/dal";
import { getCompanySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Company settings",
};

export default async function CompanySettingsPage() {
  await requireAdmin();

  const settings = await getCompanySettings();

  return (
    <CompanySettingsForm
      values={{
        name: settings.name,
        tagline: settings.tagline ?? "",
        email: settings.email ?? "",
        phone: settings.phone ?? "",
        website: settings.website ?? "",
        addressLine1: settings.addressLine1 ?? "",
        addressLine2: settings.addressLine2 ?? "",
        city: settings.city ?? "",
        state: settings.state ?? "",
        postalCode: settings.postalCode ?? "",
        country: settings.country,
        gstin: settings.gstin ?? "",
        pan: settings.pan ?? "",
        bankName: settings.bankName ?? "",
        bankAccountNo: settings.bankAccountNo ?? "",
        bankIfsc: settings.bankIfsc ?? "",
        bankBranch: settings.bankBranch ?? "",
        upiId: settings.upiId ?? "",
        invoicesPrefix: settings.invoicesPrefix,
        quotationPrefix: settings.quotationPrefix,
        purchaseOrderPrefix: settings.purchaseOrderPrefix,
        defaultTaxRate: String(settings.defaultTaxRate),
        homeState: settings.homeState,
      }}
    />
  );
}
