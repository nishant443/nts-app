"use client";

import { useActionState } from "react";

import { saveCustomer } from "@/app/actions/customers";
import {
  CustomerFields,
  type CustomerFormValues,
} from "@/components/customers/customer-fields";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormActions } from "@/components/ui/field";
import { emptyFormState } from "@/lib/form-state";

export type { CustomerFormValues };

export function CustomerForm({
  values,
  owners,
  canAssignOwner,
}: {
  values: CustomerFormValues;
  owners: { id: string; name: string }[];
  canAssignOwner: boolean;
}) {
  const [state, formAction] = useActionState(saveCustomer, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormBanners state={state} />

      <CustomerFields
        values={values}
        state={state}
        owners={owners}
        canAssignOwner={canAssignOwner}
        section={({ title, description, children }) => (
          <Card key={title}>
            <CardHeader title={title} description={description} />
            <CardBody>{children}</CardBody>
          </Card>
        )}
      />

      <FormActions>
        <Button
          href={values.id ? `/customers/${values.id}` : "/customers"}
          variant="ghost"
        >
          Cancel
        </Button>
        <SubmitButton>
          {values.id ? "Save changes" : "Add customer"}
        </SubmitButton>
      </FormActions>
    </form>
  );
}
