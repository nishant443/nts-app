import Image from "next/image";

import { cn, hashHue, initials } from "@/lib/utils";

const sizes = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-[13px]",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
} as const;

/**
 * Avatar with a deterministic colour fallback, so the same person is always the
 * same tint even before they upload a photo.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const dimension = size === "sm" ? 28 : size === "md" ? 36 : size === "lg" ? 48 : 64;

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={dimension}
        height={dimension}
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-border",
          sizes[size],
          className,
        )}
      />
    );
  }

  // Hue drives both themes through a custom property, so the tint stays legible
  // on a dark surface instead of glowing.
  const hue = hashHue(name);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10",
        "bg-[oklch(0.93_0.05_var(--avatar-hue))] text-[oklch(0.45_0.14_var(--avatar-hue))]",
        "dark:bg-[oklch(0.33_0.07_var(--avatar-hue))] dark:text-[oklch(0.86_0.09_var(--avatar-hue))]",
        sizes[size],
        className,
      )}
      style={{ "--avatar-hue": hue } as React.CSSProperties}
    >
      {initials(name)}
    </span>
  );
}
