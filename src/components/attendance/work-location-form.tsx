"use client";

import { useActionState, useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";

import { setWorkLocation } from "@/app/actions/work-locations";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { DEFAULT_CHECK_IN_RADIUS_M } from "@/lib/attendance-rules";
import { emptyFormState, fieldError } from "@/lib/form-state";

export function WorkLocationForm({
  employees,
  defaultDate,
  defaultUserId,
  mailConfigured,
}: {
  employees: { id: string; name: string }[];
  defaultDate: string;
  defaultUserId?: string;
  mailConfigured: boolean;
}) {
  const [state, formAction] = useActionState(setWorkLocation, emptyFormState);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    const pair = text.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (!pair) return;
    event.preventDefault();
    setLatitude(pair[1]);
    setLongitude(pair[2]);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser cannot share your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setLocating(false);
        toast.success(
          `Location captured (accurate to about ${Math.round(coords.accuracy)} m).`,
        );
      },
      () => {
        setLocating(false);
        toast.error(
          "Could not read your location. Allow location access for this site and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Set a work location"
          description="Applies from the chosen date until you set a newer one. Saving the same employee and date again replaces that entry."
        />
        <CardBody className="flex flex-col gap-4">
          <FormBanners state={state} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Field
              label="Employee"
              htmlFor="userId"
              required
              className="lg:col-span-2"
              error={fieldError(state, "userId")}
            >
              <Select
                id="userId"
                name="userId"
                defaultValue={defaultUserId ?? ""}
                required
                invalid={Boolean(fieldError(state, "userId"))}
              >
                <option value="">Select…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="From date"
              htmlFor="date"
              required
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
              label="Location name"
              htmlFor="label"
              required
              className="lg:col-span-3"
              error={fieldError(state, "label")}
            >
              <Input
                id="label"
                name="label"
                placeholder="BFW plant, Bengaluru"
                required
                invalid={Boolean(fieldError(state, "label"))}
              />
            </Field>

            <Field
              label="Latitude"
              htmlFor="latitude"
              required
              className="lg:col-span-2"
              hint="Right-click the spot in Google Maps and paste the coordinates here."
              error={fieldError(state, "latitude")}
            >
              <Input
                id="latitude"
                name="latitude"
                inputMode="decimal"
                placeholder="12.971599"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                onPaste={handlePaste}
                required
                className="tnum"
                invalid={Boolean(fieldError(state, "latitude"))}
              />
            </Field>

            <Field
              label="Longitude"
              htmlFor="longitude"
              required
              className="lg:col-span-2"
              error={fieldError(state, "longitude")}
            >
              <Input
                id="longitude"
                name="longitude"
                inputMode="decimal"
                placeholder="77.594566"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                onPaste={handlePaste}
                required
                className="tnum"
                invalid={Boolean(fieldError(state, "longitude"))}
              />
            </Field>

            <Field
              label="Radius (m)"
              htmlFor="radiusMeters"
              required
              error={fieldError(state, "radiusMeters")}
            >
              <Input
                id="radiusMeters"
                name="radiusMeters"
                inputMode="numeric"
                defaultValue={String(DEFAULT_CHECK_IN_RADIUS_M)}
                required
                className="tnum"
                invalid={Boolean(fieldError(state, "radiusMeters"))}
              />
            </Field>

            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={useCurrentLocation}
                disabled={locating}
                block
              >
                <LocateFixed aria-hidden="true" />
                {locating ? "Finding…" : "Use my location"}
              </Button>
            </div>

            <Field
              label="Note for the employee"
              htmlFor="notes"
              className="sm:col-span-2 lg:col-span-6"
              error={fieldError(state, "notes")}
            >
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Report at gate 2; ask for Mr. Rao."
              />
            </Field>
          </div>

          <Checkbox
            id="emailEmployee"
            name="emailEmployee"
            disabled={!mailConfigured}
            label={
              mailConfigured
                ? "Also email this to the employee now (they always get the in-app notification)"
                : "Email is not set up — the employee will get the in-app notification only"
            }
          />

          <div>
            <SubmitButton pendingLabel="Saving…">Save location</SubmitButton>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
