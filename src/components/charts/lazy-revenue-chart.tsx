"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/feedback";

export const LazyRevenueChart = dynamic(
  () => import("@/components/charts/revenue-chart").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  },
);
