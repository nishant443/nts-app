import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { Check, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Right half of the sign-in card: a deep-blue visual with a few floating
 * glimpses of the product — a service job, this week's calendar, who is in
 * today. Pure decoration; nothing here is live data.
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

const TEAM = [
  { initials: "SS", className: "bg-brand-500" },
  { initials: "SN", className: "bg-sky-500" },
  { initials: "NI", className: "bg-indigo-500" },
  { initials: "SH", className: "bg-cyan-600" },
];

export function VisualPanel() {
  const hasPhoto = existsSync(path.join(process.cwd(), "public", PHOTO));
  const week = thisWeek();

  return (
    <aside
      aria-hidden="true"
      className="relative hidden p-3 lg:block"
    >
      <div className="relative h-full min-h-[40rem] overflow-hidden rounded-[1.75rem] bg-[radial-gradient(ellipse_at_top_left,#1e3a70_0%,#132a55_40%,#0c1a36_100%)] text-white">
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
            {/* Engineering grid + soft light blooms stand in for a photo. */}
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />
            <div className="absolute -left-24 top-1/3 size-[26rem] rounded-full bg-brand-500/35 blur-3xl" />
            <div className="absolute -bottom-32 right-0 size-[30rem] rounded-full bg-sky-400/25 blur-3xl" />
            <div className="absolute -right-20 -top-20 size-[18rem] rounded-full bg-indigo-400/20 blur-3xl" />
          </>
        )}
        {/* Keeps the cards legible over a busy photo. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1a36]/70 via-transparent to-[#0c1a36]/30" />

        {/* Job card, with an earlier one peeking out behind ---------------- */}
        <div className="absolute left-8 top-8 w-[17rem]">
          <div className="absolute -bottom-9 -right-8 left-10 top-10 flex items-end justify-end whitespace-nowrap rounded-2xl bg-[#101d38]/90 px-4 pb-2.5 text-[12px] text-white/60 shadow-overlay ring-1 ring-white/10">
            02:00pm–04:00pm · Site visit
          </div>
          <div className="relative rounded-2xl bg-white p-4 text-fg shadow-overlay">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold">
                  Spindle service · Mazak VTC
                </p>
                <p className="mt-0.5 text-[12px] text-fg-muted">
                  09:30am–11:00am
                </p>
              </div>
              <span className="mt-1 size-2.5 shrink-0 rounded-full bg-accent" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[12px] text-fg-muted">
              <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Wrench className="size-3.5" />
              </span>
              Yamazaki Mazak India · Bengaluru
            </div>
          </div>
        </div>

        {/* This week ------------------------------------------------------ */}
        <div className="absolute left-1/2 top-[46%] w-[24rem] -translate-x-1/2 rounded-2xl bg-white/10 p-4 shadow-overlay ring-1 ring-white/15 backdrop-blur-md">
          <div className="grid grid-cols-7 text-center">
            {DAYS.map((day, index) => {
              const isToday = index === week.today;
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[12px] text-white/60">{day}</span>
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-[15px] font-medium",
                      isToday ? "bg-accent text-white shadow-raised" : "text-white/90",
                    )}
                  >
                    {week.dates[index]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 h-8 rounded-lg bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/0.12)_6px_7px)]" />
        </div>

        {/* Attendance ----------------------------------------------------- */}
        <div className="absolute bottom-10 left-10 w-[16.5rem] rounded-2xl bg-white p-4 text-fg shadow-overlay">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold">Attendance today</p>
              <p className="mt-0.5 text-[12px] text-fg-muted">
                Everyone checked in before 09:15
              </p>
            </div>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
              <Check className="size-3.5" />
            </span>
          </div>
          <div className="mt-3 flex -space-x-2">
            {TEAM.map((member) => (
              <span
                key={member.initials}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white",
                  member.className,
                )}
              >
                {member.initials}
              </span>
            ))}
          </div>
        </div>

        {/* Team cluster --------------------------------------------------- */}
        <div className="absolute right-16 top-[34%] h-[7.8rem] w-[7.2rem]">
          {TEAM.slice(0, 3).map((member, index) => (
            <span
              key={member.initials}
              className={cn(
                "absolute flex size-14 items-center justify-center rounded-full text-[13px] font-semibold text-white shadow-overlay ring-4 ring-white/20",
                member.className,
              )}
              style={{
                left: `${[0, 3.6, 1.2][index]}rem`,
                top: `${[0, 1.4, 4.2][index]}rem`,
              }}
            >
              {member.initials}
            </span>
          ))}
        </div>

        {/* Tagline -------------------------------------------------------- */}
        <div className="absolute bottom-10 right-10 max-w-[15rem] text-right">
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
