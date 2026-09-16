"use client";

import { Trash2 } from "lucide-react";

import { deleteWorkLocation } from "@/app/actions/work-locations";
import { ConfirmAction } from "@/components/documents/confirm-action";
import { formatDate } from "@/lib/dates";

export interface WorkLocationHistoryRow {
  id: string;
  date: string;
  employeeName: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  setByName: string;
}

/** Recent entries, newest first, each removable. */
export function WorkLocationHistory({
  rows,
}: {
  rows: WorkLocationHistoryRow[];
}) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
        >
          <span className="tnum w-24 shrink-0 text-[13px] text-fg-muted">
            {formatDate(row.date)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-fg">
              {row.employeeName}
              <span className="font-normal text-fg-muted"> · {row.label}</span>
            </span>
            <span className="tnum block text-[12px] text-fg-subtle">
              {row.latitude.toFixed(5)}, {row.longitude.toFixed(5)} ·{" "}
              {row.radiusMeters} m · set by {row.setByName}
            </span>
          </span>
          <ConfirmAction
            action={deleteWorkLocation}
            input={{ id: row.id }}
            title="Remove this location entry?"
            body={`${row.employeeName} will fall back to the entry before ${formatDate(row.date)}, or have no location if there is none.`}
            confirmLabel="Remove"
            variant="ghost"
            size="sm"
            successMessage="Location entry removed."
            trigger={
              <>
                <Trash2 aria-hidden="true" />
                <span className="sr-only">
                  Remove {row.label} for {row.employeeName}
                </span>
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}
