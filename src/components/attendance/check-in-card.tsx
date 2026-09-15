"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

import { checkIn, checkOut } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { showSuccess } from "@/components/ui/success-popup";
import type { CheckInGate } from "@/lib/attendance-rules";
import { formatDuration, formatTime } from "@/lib/dates";

/**
 * Today's check-in / check-out.
 *
 * The elapsed time shown after checking in is computed once on the server and
 * ticks locally — deliberately not a live-updating clock, which would keep the
 * whole tree re-rendering all day for no real benefit.
 */
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
  const router = useRouter();

  const run = (
    fn: typeof checkIn,
    successMessage: string,
  ) => {
    startTransition(async () => {
      const result = await fn();
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
            {pending ? "Checking in…" : "Check in"}
          </Button>
        )}

        {!hasCheckedIn && !gate.open && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3.5 py-2 text-[13px] font-medium text-fg-muted">
            <CalendarOff aria-hidden="true" className="size-4" />
            {gate.reason === "before_hours"
              ? `Opens at ${gate.opensAt}`
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
            {pending ? "Checking out…" : "Check out"}
          </Button>
        )}

        {hasCheckedIn && hasCheckedOut && (
          <p className="text-[13px] font-medium text-success">
            Day complete
          </p>
        )}
      </div>
    </div>
  );
}
