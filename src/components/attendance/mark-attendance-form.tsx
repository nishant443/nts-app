"use client";

import { useActionState } from "react";

import { markAttendance } from "@/app/actions/attendance";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";


export function MarkAttendanceForm({
  employees,
  defaultDate,
}: {
  employees: { id: string; name: string }[];
  defaultDate: string;
}) {
  const [state, formAction] = useActionState(markAttendance, emptyFormState);

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Mark attendance"
          description="Record or correct a day for any employee."
        />
        <CardBody className="flex flex-col gap-4">
          <FormBanners state={state} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <Field
              label="Employee"
              htmlFor="userId"
              className="lg:col-span-2"
              error={fieldError(state, "userId")}
            >
              <Select id="userId" name="userId" required>
                <option value="">Select…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Date" htmlFor="date" error={fieldError(state, "date")}>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={defaultDate}
                required
              />
            </Field>

            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue="PRESENT">
                <option value="PRESENT">Present</option>
                <option value="HALF_DAY">Half day</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On leave</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="WEEK_OFF">Week off</option>
              </Select>
            </Field>

            <Field
              label="In"
              htmlFor="checkInAt"
              error={fieldError(state, "checkInAt")}
            >
              <Input id="checkInAt" name="checkInAt" type="time" />
            </Field>

            <Field
              label="Out"
              htmlFor="checkOutAt"
              error={fieldError(state, "checkOutAt")}
            >
              <Input id="checkOutAt" name="checkOutAt" type="time" />
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Note" htmlFor="notes" className="min-w-0 flex-1">
              <Input
                id="notes"
                name="notes"
                placeholder="Client site visit — checked in late."
              />
            </Field>
            <SubmitButton>Save attendance</SubmitButton>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
