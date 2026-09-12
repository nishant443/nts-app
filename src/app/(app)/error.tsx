"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Next passes a `digest` for errors thrown on the
 * server; the message itself is withheld in production, so the digest is what
 * ties a user's report to the server log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route] render failed", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <RotateCw aria-hidden="true" className="size-5" />
        </div>

        <div>
          <h1 className="text-lg font-semibold text-fg">
            This page could not be loaded
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
            Something went wrong while fetching the data. Trying again usually
            resolves it.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-[11.5px] text-fg-subtle">
              Reference: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button variant="secondary" href="/dashboard">
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
