"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Today's date, a ticking clock, and a sky that matches the hour — a warm sun
 * by day, a moon with a scatter of stars at night. All computed in the
 * browser so it shows the visitor's own time; nothing renders until then, so
 * the server never guesses.
 */

type Phase = "dawn" | "day" | "dusk" | "night";

function phaseOf(hour: number): Phase {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 19.5) return "dusk";
  return "night";
}

/** Fixed positions so the stars don't jump between renders. */
const STARS = [
  [12, 18], [22, 9], [35, 24], [48, 12], [58, 30], [66, 8], [78, 20],
  [86, 34], [30, 40], [72, 42], [90, 12], [8, 36], [52, 44], [42, 6],
] as const;

export function SkyClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    // Once a second keeps the seconds hand honest; cheap enough for one page.
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return null;

  const hour = now.getHours() + now.getMinutes() / 60;
  const phase = phaseOf(hour);
  const night = phase === "night";

  const weekday = now.toLocaleDateString("en-IN", { weekday: "long" });
  const date = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const seconds = now.getSeconds().toString().padStart(2, "0");

  return (
    <>
      {/* Sky ------------------------------------------------------------ */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 transition-colors duration-1000",
          phase === "dawn" && "bg-[radial-gradient(ellipse_at_top_right,#f6b26b33_0%,transparent_45%)]",
          phase === "dusk" && "bg-[radial-gradient(ellipse_at_top_right,#ff9a6233_0%,transparent_45%)]",
        )}
      />

      {/* Sun or moon, top right. */}
      <div
        aria-hidden="true"
        className="absolute right-12 top-12 size-24"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-2xl",
            night ? "bg-sky-200/30" : "bg-amber-300/50",
          )}
        />
        <div
          className={cn(
            "absolute inset-3 rounded-full shadow-overlay",
            night
              ? "bg-[radial-gradient(circle_at_35%_35%,#f8fafc_0%,#cbd5e1_70%,#94a3b8_100%)]"
              : "bg-[radial-gradient(circle_at_35%_35%,#fff7cc_0%,#fbbf24_60%,#f59e0b_100%)]",
          )}
        />
        {night && (
          // The crescent: a disc of sky laid over the moon's edge.
          <div className="absolute inset-3 translate-x-4 -translate-y-1 rounded-full bg-[#0f1f3f]" />
        )}
      </div>

      {night &&
        STARS.map(([x, y], index) => (
          <span
            key={index}
            aria-hidden="true"
            className="animate-twinkle absolute size-1 rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${(index * 0.37) % 3.2}s`,
            }}
          />
        ))}

      {/* Date and time ------------------------------------------------- */}
      <div className="absolute left-9 top-9">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brand-200">
          Today
        </p>
        <p className="mt-1 text-[34px] font-semibold leading-none tracking-tight">
          {weekday}
        </p>
        <p className="mt-2 text-[15px] text-white/75">{date}</p>

        <p className="tnum mt-6 flex items-baseline gap-1.5 text-[44px] font-semibold leading-none tracking-tight">
          {time.replace(/\s?(am|pm)$/i, "")}
          <span className="text-[15px] font-medium text-white/60">
            :{seconds}
          </span>
          <span className="text-[15px] font-medium uppercase text-brand-200">
            {time.slice(-2)}
          </span>
        </p>
      </div>
    </>
  );
}
