import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <Link href="/dashboard">
          <LogoMark className="size-11" />
        </Link>

        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">
            404
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg">
            Page not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            The page you are looking for has moved or never existed. Check the
            address, or head back to your dashboard.
          </p>
        </div>

        <Button href="/dashboard" variant="primary">
          Back to dashboard
        </Button>
      </div>
    </main>
  );
}
