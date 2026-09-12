import type { Metadata } from "next";
import { CircuitBoard, Cpu, Wrench } from "lucide-react";

import { LogoFull } from "@/components/brand/logo";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

const HIGHLIGHTS = [
  {
    icon: Wrench,
    title: "Service operations",
    body: "Quotations, invoices, payments and purchase orders in one ledger.",
  },
  {
    icon: Cpu,
    title: "Workforce",
    body: "Attendance, leave, daily work reports and payroll in step.",
  },
  {
    icon: CircuitBoard,
    title: "Built for the floor",
    body: "Works on the phone in your pocket as well as the office desktop.",
  },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — hidden on phones where it would push the form below
          the fold. */}
      <section className="relative hidden overflow-hidden bg-steel-950 p-10 lg:flex lg:flex-col lg:justify-between">
        {/* Decorative field: a soft blue wash plus a faint engineering grid. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-24 size-[30rem] rounded-full bg-brand-600/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-16 size-[26rem] rounded-full bg-brand-500/15 blur-3xl"
        />

        <div className="relative">
          <div className="inline-flex rounded-xl bg-white/95 px-5 py-4 shadow-lg">
            <LogoFull className="h-14" priority />
          </div>
        </div>

        <div className="relative flex flex-col gap-8">
          <div>
            <h1 className="max-w-md text-[2rem] font-semibold leading-tight tracking-tight text-white">
              Precision restored,
              <br />
              performance assured.
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65">
              CNC maintenance, retrofitting, automation and robotics — with the
              paperwork handled.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300 ring-1 ring-inset ring-white/15">
                    <Icon aria-hidden="true" className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">
                      {item.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-[12px] text-white/40">
          © {new Date().getFullYear()} Nutan Tech Solutions · Bengaluru,
          Karnataka
        </p>
      </section>

      {/* Form panel ------------------------------------------------------ */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[24rem]">
          <div className="mb-8 flex flex-col items-center gap-5 lg:hidden">
            <LogoFull className="h-16" priority />
          </div>

          <div className="mb-7">
            <h2 className="text-[26px] font-semibold tracking-tight text-fg">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-fg-muted">
              Use the account your administrator set up for you.
            </p>
          </div>

          <LoginForm />

          <p className="mt-7 border-t border-border pt-5 text-[13px] leading-relaxed text-fg-subtle">
            Forgotten your password? Ask an administrator to reset it for you —
            for security, passwords cannot be recovered by email.
          </p>
        </div>
      </section>
    </main>
  );
}
