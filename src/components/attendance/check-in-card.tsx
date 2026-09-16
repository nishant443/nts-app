"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  MapPinOff,
} from "lucide-react";
import { toast } from "sonner";

import { checkIn, checkOut } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { showSuccess } from "@/components/ui/success-popup";
import type { CheckInGate, Position } from "@/lib/attendance-rules";
import { formatDate, formatDuration, formatTime } from "@/lib/dates";

/**
 * Today's check-in / check-out.
 *
 * The elapsed time shown after checking in is computed once on the server and
 * ticks locally — deliberately not a live-updating clock, which would keep the
 * whole tree re-rendering all day for no real benefit.
 *
 * The button first asks the browser for a fresh GPS fix and sends it with the
 * action; the server does the distance check against the employee's work
 * location for the day, so a tampered client gains nothing.
 */

/** A fresh, high-accuracy fix — or a message explaining why there is none. */
function locate(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot share your location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Location access is blocked for this site. Tap the lock icon next to the address, set Location to Allow, make sure your phone's location is on, then try again."
              : error.code === error.TIMEOUT
                ? "Could not get your location in time. Move somewhere with better signal and try again."
                : "Your location is unavailable right now. Try again in a moment.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
export function CheckInCard({
  status,
  checkInAt,
  checkOutAt,
  workedMinutes,
  gate,
}: {
  status: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number;
  /** Whether check-in is open right now; see `lib/attendance-rules.ts`. */
  gate: CheckInGate;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useState(false);
  const [locating, setLocating] = useState(false);
  const router = useRouter();

  const run = (fn: typeof checkIn, successMessage: string) => {
    startTransition(async () => {
      let position: Position;
      setLocating(true);
      try {
        position = await locate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
        return;
      } finally {
        setLocating(false);
      }

      const result = await fn(position);
      if (result.ok) {
        showSuccess(successMessage);
        setOptimisticDone(true);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const hasCheckedIn = Boolean(checkInAt);
  const hasCheckedOut = Boolean(checkOutAt);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Clock aria-hidden="true" className="size-5" />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-fg">Today</p>
            {status && <StatusBadge status={status} />}
          </div>

          <p className="mt-0.5 text-[13px] text-fg-muted">
            {!hasCheckedIn && gate.open && "You have not checked in yet."}
            {!hasCheckedIn && !gate.open && gate.message}
            {hasCheckedIn && !hasCheckedOut && (
              <>In since {formatTime(checkInAt)}</>
            )}
            {hasCheckedIn && hasCheckedOut && (
              <>
                {formatTime(checkInAt)} – {formatTime(checkOutAt)} ·{" "}
                <span className="font-medium text-fg">
                  {formatDuration(workedMinutes)}
                </span>
              </>
            )}
          </p>

          {gate.location && !hasCheckedOut && (
            <p className="mt-1 flex items-start gap-1 text-[12px] text-fg-subtle">
              <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Today&apos;s location:{" "}
                <span className="font-medium text-fg-muted">
                  {gate.location.label}
                </span>
                {gate.location.inheritedFrom && (
                  <> (set on {formatDate(gate.location.inheritedFrom)})</>
                )}{" "}
                — check-in works within {gate.location.radiusMeters} m of it.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {!hasCheckedIn && gate.open && (
          <Button
            variant="primary"
            onClick={() => run(checkIn, "Checked in. Have a good shift.")}
            disabled={pending || optimisticDone}
            block
            className="sm:w-auto"
          >
            <LogIn aria-hidden="true" />
            {locating ? "Finding you…" : pending ? "Checking in…" : "Check in"}
          </Button>
        )}

        {!hasCheckedIn && !gate.open && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3.5 py-2 text-[13px] font-medium text-fg-muted">
            {gate.reason === "no_location" ? (
              <MapPinOff aria-hidden="true" className="size-4" />
            ) : (
              <CalendarOff aria-hidden="true" className="size-4" />
            )}
            {gate.reason === "no_location"
              ? "No location set"
              : gate.reason === "sunday"
                ? "Weekly off"
                : "Holiday"}
          </span>
        )}

        {hasCheckedIn && !hasCheckedOut && (
          <Button
            variant="secondary"
            onClick={() => run(checkOut, "Checked out. See you tomorrow.")}
            disabled={pending || optimisticDone}
            block
            className="sm:w-auto"
          >
            <LogOut aria-hidden="true" />
            {locating
              ? "Finding you…"
              : pending
                ? "Checking out…"
                : "Check out"}
          </Button>
        )}

        {hasCheckedIn && hasCheckedOut && (
          <p className="text-[13px] font-medium text-success">Day complete</p>
        )}
      </div>
    </div>
  );
}
