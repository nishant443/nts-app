"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { addHoliday, deleteHoliday } from "@/app/actions/settings";
import { ConfirmAction } from "@/components/documents/confirm-action";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { formatDate } from "@/lib/dates";
import { emptyFormState, fieldError } from "@/lib/form-state";

/** Add a holiday, and the list of existing ones. */
export function HolidayManager({ defaultDate }: { defaultDate: string }) {
  const [state, formAction] = useActionState(addHoliday, emptyFormState);

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Add a holiday"
          description="Saving a date that already exists updates its name."
        />
        <CardBody className="flex flex-col gap-4">
          <FormBanners state={state} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field
              label="Date"
              htmlFor="date"
              className="sm:w-48"
              error={fieldError(state, "date")}
            >
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={defaultDate}
                required
              />
            </Field>

            <Field
              label="Holiday name"
              htmlFor="name"
              className="min-w-0 flex-1"
              error={fieldError(state, "name")}
            >
              <Input
                id="name"
                name="name"
                placeholder="Deepavali"
                required
                invalid={Boolean(fieldError(state, "name"))}
              />
            </Field>

            <SubmitButton>Add holiday</SubmitButton>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}

/**
 * Exported separately rather than hung off `HolidayManager`: a Client
 * Component reaches a Server Component as a module reference, so property
 * access on it (`HolidayManager.List`) is not a component.
 */
export function HolidayList({
  holidays,
}: {
  holidays: { id: string; date: string; name: string }[];
}) {
  return (
    <ul className="divide-y divide-border">
      {holidays.map((holiday) => (
        <li
          key={holiday.id}
          className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
        >
          <span className="tnum w-28 shrink-0 text-[13px] text-fg-muted">
            {formatDate(holiday.date)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-fg">
            {holiday.name}
          </span>
          <ConfirmAction
            action={deleteHoliday}
            input={{ id: holiday.id }}
            title="Remove this holiday?"
            body="Attendance and payroll will treat the date as an ordinary working day again."
            confirmLabel="Remove"
            variant="ghost"
            size="sm"
            className="text-fg-subtle hover:bg-danger-soft hover:text-danger"
            successMessage="Holiday removed."
            trigger={
              <>
                <Trash2 aria-hidden="true" />
                <span className="sr-only">Remove {holiday.name}</span>
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}
