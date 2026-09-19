import Image from "next/image";

import { cn } from "@/lib/utils";

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

export function LogoAdaptive({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        src="/brand/nts-logo-light.png"
        alt="Nutan Tech Solutions"
        width={457}
        height={209}
        priority={priority}
        className={cn("h-auto w-auto object-contain dark:hidden", className)}
      />
      <Image
        src="/brand/nts-logo-dark.png"
        alt=""
        aria-hidden="true"
        width={457}
        height={209}
        priority={priority}
        className={cn("hidden h-auto w-auto object-contain dark:block", className)}
      />
    </>
  );
}

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

export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <LogoAdaptive className="h-12" priority />
    </span>
  );
}
