"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/feedback";

/**
 * Recharts is a heavy dependency that only ever runs in the browser. Splitting
 * it out here keeps it off the dashboard's critical path — the page streams and
 * becomes interactive, then the chart fills in.
 *
 * The placeholder reserves the chart's exact height so nothing shifts when it
 * arrives.
 */
export const LazyRevenueChart = dynamic(
  () => import("@/components/charts/revenue-chart").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  },
);
