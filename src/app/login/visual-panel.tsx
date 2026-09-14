import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { MapPin } from "lucide-react";

import { SkyClock } from "@/app/login/sky-clock";
import { cn } from "@/lib/utils";

/**
 * Right half of the sign-in card: a deep-blue sky with today's date, a live
 * clock, this week's calendar and a sun or moon to suit the hour. Decoration
 * only — nothing here is business data.
 *
 * Drop a photo at `public/brand/login-photo.jpg` (a workshop or team shot)
 * and it is used as the backdrop; otherwise the gradient stands on its own.
 */

const PHOTO = "/brand/login-photo.jpg";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The current week, Sunday to Saturday, with today's index. */
function thisWeek(): { dates: number[]; today: number } {
  const now = new Date();
  const today = now.getDay();
  const dates = DAYS.map((_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - today + index);
    return day.getDate();
  });
  return { dates, today };
}

export function VisualPanel() {
  const hasPhoto = existsSync(path.join(process.cwd(), "public", PHOTO));
  const week = thisWeek();

  return (
    <aside aria-hidden="true" className="relative hidden p-3 lg:block">
      <div className="absolute inset-3 overflow-hidden rounded-[1.75rem] bg-[radial-gradient(ellipse_at_top_left,#1e3a70_0%,#132a55_40%,#0c1a36_100%)] text-white">
        {hasPhoto ? (
          <Image
            src={PHOTO}
            alt=""
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            priority
            className="object-cover"
          />
        ) : (
          <>
            {/* Engineering grid + slowly drifting light blooms. */}
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />
            <div className="animate-drift absolute -left-24 top-1/3 size-[26rem] rounded-full bg-brand-500/35 blur-3xl" />
            <div className="animate-drift absolute -bottom-32 right-0 size-[30rem] rounded-full bg-sky-400/25 blur-3xl [animation-delay:-7s]" />
          </>
        )}
        {/* Keeps the type legible over a busy photo. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1a36]/70 via-transparent to-[#0c1a36]/20" />

        <SkyClock />

        {/* This week ------------------------------------------------------ */}
        <div className="absolute left-1/2 top-1/2 w-[min(24rem,calc(100%-4rem))] -translate-x-1/2 -translate-y-1/4 rounded-2xl bg-white/10 p-4 shadow-overlay ring-1 ring-white/15 backdrop-blur-md">
          <div className="grid grid-cols-7 text-center">
            {DAYS.map((day, index) => {
              const isToday = index === week.today;
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[12px] text-white/60">{day}</span>
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-[15px] font-medium",
                      isToday
                        ? "bg-accent text-white shadow-raised"
                        : "text-white/90",
                    )}
                  >
                    {week.dates[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Where and when ------------------------------------------------- */}
        <div className="absolute bottom-9 left-9 flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
            <MapPin className="size-3.5 text-brand-200" />
            Bengaluru
          </span>
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
            IST · UTC+5:30
          </span>
        </div>

        {/* Tagline -------------------------------------------------------- */}
        <div className="absolute bottom-9 right-9 max-w-[15rem] text-right">
          <p className="text-[17px] font-semibold leading-snug">
            Precision restored,
            <br />
            <span className="text-brand-300">performance assured.</span>
          </p>
          <p className="mt-1.5 text-[12px] text-white/60">
            CNC service, retrofits and automation — with the paperwork handled.
          </p>
        </div>
      </div>
    </aside>
  );
}
