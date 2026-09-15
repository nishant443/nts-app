"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";
import { fieldError } from "@/lib/form-state";

/**
 * Office coordinates for the check-in fence. Most admins will press "Use my
 * current location" while standing in the office; the inputs stay editable so
 * a value from Google Maps can be pasted instead.
 */
export function OfficeLocationFields({
  state,
  values,
}: {
  state: FormState;
  values: {
    officeLatitude: string;
    officeLongitude: string;
    checkInRadiusMeters: string;
  };
}) {
  const [latitude, setLatitude] = useState(values.officeLatitude);
  const [longitude, setLongitude] = useState(values.officeLongitude);
  const [locating, setLocating] = useState(false);

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
    <FormGrid>
      <Field
        label="Office latitude"
        htmlFor="officeLatitude"
        error={fieldError(state, "officeLatitude")}
      >
        <Input
          id="officeLatitude"
          name="officeLatitude"
          inputMode="decimal"
          placeholder="12.971599"
          value={latitude}
          onChange={(event) => setLatitude(event.target.value)}
          className="tnum"
          invalid={Boolean(fieldError(state, "officeLatitude"))}
        />
      </Field>

      <Field
        label="Office longitude"
        htmlFor="officeLongitude"
        error={fieldError(state, "officeLongitude")}
      >
        <Input
          id="officeLongitude"
          name="officeLongitude"
          inputMode="decimal"
          placeholder="77.594566"
          value={longitude}
          onChange={(event) => setLongitude(event.target.value)}
          className="tnum"
          invalid={Boolean(fieldError(state, "officeLongitude"))}
        />
      </Field>

      <Field
        label="Allowed radius (metres)"
        htmlFor="checkInRadiusMeters"
        required
        hint="Phone GPS is usually accurate to 5–20 m; 30 m is a sensible minimum."
        error={fieldError(state, "checkInRadiusMeters")}
      >
        <Input
          id="checkInRadiusMeters"
          name="checkInRadiusMeters"
          inputMode="numeric"
          defaultValue={values.checkInRadiusMeters}
          required
          className="tnum"
          invalid={Boolean(fieldError(state, "checkInRadiusMeters"))}
        />
      </Field>

      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          onClick={useCurrentLocation}
          disabled={locating}
        >
          <LocateFixed aria-hidden="true" />
          {locating ? "Finding you…" : "Use my current location"}
        </Button>
      </div>
    </FormGrid>
  );
}
