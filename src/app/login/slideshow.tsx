"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const SLIDES = [
  {
    src: "/brand/login/kellenberger-k10-1.jpg",
    title: "Kellenberger K10",
    caption: "Precision grinding — service and calibration",
  },
  {
    src: "/brand/login/bfw-h1250-russia-1.jpg",
    title: "BFW H1250",
    caption: "Installation and commissioning — Russia",
  },
  {
    src: "/brand/login/kellenberger-k10-2.jpg",
    title: "Kellenberger K10",
    caption: "CNC grinding machine, ready for production",
  },
  {
    src: "/brand/login/bfw-h1250-russia-2.jpg",
    title: "BFW H1250",
    caption: "On-site setup — Russia",
  },
  {
    src: "/brand/login/bfw-h1250-russia-3.jpg",
    title: "BFW H1250",
    caption: "Installation and testing — Russia",
  },
  {
    src: "/brand/login/bfw-h1250-russia-4.jpg",
    title: "BFW H1250",
    caption: "Machine commissioning — Russia",
  },
];

const SLIDE_MS = 3500;

export function Slideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % SLIDES.length),
      SLIDE_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  const slide = SLIDES[active];
  const step = (delta: number) =>
    setActive((index) => (index + delta + SLIDES.length) % SLIDES.length);

  return (
    <div
      className="group absolute inset-3 overflow-hidden rounded-[1.75rem] bg-[#0c1a36] text-white"
    >
      {SLIDES.map((item, index) => {
        const visible = index === active;
        return (
          <div
            key={item.src}
            aria-hidden={!visible}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              visible ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={item.src}
              alt={visible ? `${item.title} — ${item.caption}` : ""}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority={index === 0}
              className={cn(
                "object-cover",
                visible && "animate-kenburns",
              )}
            />
          </div>
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1a36]/75 via-transparent to-[#0c1a36]/85" />

      <LiveDate />

      <div className="absolute inset-x-9 bottom-9 flex items-end justify-between gap-6">
        <div key={slide.src} className="animate-in-up min-w-0">
          <p className="text-[22px] font-semibold leading-tight tracking-tight">
            {slide.title}
          </p>
          <p className="mt-0.5 text-[13.5px] text-white/75">{slide.caption}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pb-1">
          {SLIDES.map((item, index) => (
            <button
              key={item.src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}: ${item.title}`}
              aria-current={index === active || undefined}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === active
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>

      <ArrowButton label="Previous photo" side="left" onClick={() => step(-1)}>
        <ChevronLeft className="size-5" />
      </ArrowButton>
      <ArrowButton label="Next photo" side="right" onClick={() => step(1)}>
        <ChevronRight className="size-5" />
      </ArrowButton>
    </div>
  );
}

function ArrowButton({
  label,
  side,
  onClick,
  children,
}: {
  label: string;
  side: "left" | "right";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm",
        "opacity-0 transition-[opacity,background-color,transform] duration-200 group-hover:opacity-100 focus-visible:opacity-100",
        "hover:bg-black/50 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      {children}
    </button>
  );
}

function LiveDate() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return null;

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

  return (
    <div className="absolute left-9 top-8 flex items-start justify-between gap-6 right-9">
      <div>
        <p className="text-[28px] font-semibold leading-none tracking-tight">
          {weekday}
        </p>
        <p className="mt-1.5 text-[14px] text-white/75">{date}</p>
      </div>
      <p className="tnum text-right text-[28px] font-semibold leading-none tracking-tight">
        {time.replace(/\s?(am|pm)$/i, "")}
        <span className="ml-1.5 text-[13px] font-medium uppercase text-brand-200">
          {time.slice(-2)}
        </span>
      </p>
    </div>
  );
}
