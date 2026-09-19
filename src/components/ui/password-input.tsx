"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  "type"
>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-accent-soft hover:text-accent"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-[17px]" />
        ) : (
          <Eye aria-hidden="true" className="size-[17px]" />
        )}
      </button>
    </span>
  );
}
