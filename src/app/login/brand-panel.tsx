"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { CalendarCheck, Receipt, Wrench, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Left half of the sign-in screen.
 *
 * Kept deliberately light: the logo, one line about what NTS does, and one
 * highlight at a time that rotates on its own (pauses while hovered, and the
 * dots let you jump). A soft spotlight follows the pointer so the panel feels
 * alive without competing with the form.
 */

const HIGHLIGHTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Wrench,
    title: "Every site visit, on record",
    body: "Daily work reports from the floor, reviewed and ready to bill.",
  },
  {
    icon: Receipt,
    title: "Quote → invoice → payment",
    body: "GST-correct documents and a live view of who still owes what.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance to payslip",
    body: "Check-ins, leave and expenses flow straight into payroll.",
  },
];

const ROTATE_MS = 4500;

export function BrandPanel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(
      () => setActive((i) => (i + 1) % HIGHLIGHTS.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [paused]);

  // Spotlight position is written straight to CSS variables — no re-render
  // per mouse move.
  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panel.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    panel.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  const current = HIGHLIGHTS[active];
  const Icon = current.icon;

  return (
    <section
      ref={panelRef}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative hidden overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#1b2a4a_0%,#131a2a_45%,#0f141c_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between"
      style={{ "--spot-x": "30%", "--spot-y": "30%" } as React.CSSProperties}
    >
      {/* Faint engineering grid, and the pointer-following spotlight. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(28rem circle at var(--spot-x) var(--spot-y), rgba(47,119,255,0.22), transparent 60%)",
        }}
      />

      <div className="relative">
        <Image
          src="/brand/nts-logo-dark.png"
          alt="Nutan Tech Solutions"
          width={457}
          height={209}
          priority
          className="h-[4.5rem] w-auto object-contain"
        />
      </div>

      <div className="relative flex max-w-md flex-col gap-9">
        <div>
          <h1 className="text-[2.1rem] font-semibold leading-[1.15] tracking-tight">
            Precision restored,
            <br />
            <span className="text-brand-300">performance assured.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            CNC maintenance, retrofitting, automation and robotics — with the
            paperwork handled.
          </p>
        </div>

        {/* One highlight at a time; re-keyed so it animates in on change. */}
        <div className="min-h-[5.5rem]">
          <div key={active} className="animate-in-up flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-brand-300 ring-1 ring-inset ring-white/15">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">{current.title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-white/55">
                {current.body}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2" role="tablist" aria-label="Highlights">
          {HIGHLIGHTS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={item.title}
              onClick={() => setActive(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === active
                  ? "w-8 bg-brand-400"
                  : "w-3 bg-white/25 hover:bg-white/45",
              )}
            />
          ))}
        </div>
      </div>

      <p className="relative text-[12px] text-white/35">
        © {new Date().getFullYear()} Nutan Tech Solutions · Bengaluru
      </p>
    </section>
  );
}
