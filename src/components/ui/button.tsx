import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "subtle"
  | "success"
  | "dangerSoft";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
  "whitespace-nowrap transition-[background-color,color,box-shadow,border-color,transform] " +
  "duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
  "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px " +
  "[&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-card hover:bg-accent-hover " +
    "active:bg-accent-hover",
  secondary:
    "border border-border bg-surface text-fg shadow-card " +
    "hover:bg-surface-muted hover:border-border-strong",
  ghost: "text-fg-muted hover:bg-surface-muted hover:text-fg",
  danger: "bg-danger text-white shadow-card hover:brightness-110",
  subtle:
    "bg-accent-soft text-accent hover:brightness-95 dark:hover:brightness-125",
  success:
    "border border-success/25 bg-success-soft text-success shadow-card " +
    "hover:border-success/50 hover:brightness-[0.97] dark:hover:brightness-110",
  dangerSoft:
    "border border-danger/25 bg-danger-soft text-danger shadow-card " +
    "hover:border-danger/50 hover:brightness-[0.97] dark:hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-11 px-5 text-[15px] [&_svg]:size-5",
  icon: "size-9 [&_svg]:size-4",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
  block?: boolean;
}

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className"> & { href?: undefined };

type AnchorProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "href"> & {
    href: string;
  };

export function Button(props: ButtonProps | AnchorProps) {
  const {
    variant = "secondary",
    size = "md",
    className,
    block,
    children,
    ...rest
  } = props;

  const classes = cn(
    base,
    variants[variant],
    sizes[size],
    block && "w-full",
    className,
  );

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorProps;
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as ButtonProps;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
