import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The NTS mark.
 *
 * `full` uses the supplied artwork (public/brand/nts-logo.png) and is what
 * appears on the login screen and on printed documents. `mark` is a compact
 * SVG monogram drawn to match the logo's geometry — used in the collapsed
 * sidebar and as the favicon, where the raster wordmark would be unreadable.
 */

export function LogoFull({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/nts-logo.png"
      alt="Nutan Tech Solutions"
      width={456}
      height={198}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}

/** Square monogram: grey "N", blue "TS" — the logo's stacked lockup. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="Nutan Tech Solutions"
      className={cn("size-9", className)}
    >
      <rect width="40" height="40" rx="9" fill="var(--color-brand-600)" />
      <path
        d="M8.5 28V12h3.4l6.2 9.1V12h3.3v16h-3.3l-6.3-9.2V28H8.5Z"
        fill="#ffffff"
        fillOpacity="0.92"
      />
      <path
        d="M23.5 15.3V12h9v3.3h-2.8V28h-3.4V15.3h-2.8Z"
        fill="#ffffff"
      />
    </svg>
  );
}

/** Logo plus wordmark, for the sidebar header. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <LogoMark className="size-8 shrink-0" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[15px] font-bold tracking-tight text-fg">
          Nutan Tech
        </span>
        <span className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
          Solutions
        </span>
      </span>
    </span>
  );
}
