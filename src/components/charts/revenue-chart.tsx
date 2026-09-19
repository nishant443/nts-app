"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/money";

export function RevenueChart({
  data,
}: {
  data: { label: string; invoiced: number; received: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="invoicedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--fg-subtle)", fontSize: 12 }}
            dy={6}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            tickFormatter={(value: number) =>
              value >= 100000
                ? `${(value / 100000).toFixed(1)}L`
                : value >= 1000
                  ? `${Math.round(value / 1000)}k`
                  : String(value)
            }
          />

          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "0.6rem",
              fontSize: "12.5px",
              boxShadow: "var(--shadow-overlay)",
              color: "var(--fg)",
            }}
            labelStyle={{ color: "var(--fg-muted)", marginBottom: 4 }}
            formatter={(value, name) => [
              formatCurrency(typeof value === "number" ? value : 0),
              name === "invoiced" ? "Invoiced" : "Received",
            ]}
          />

          <Area
            type="monotone"
            dataKey="invoiced"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#invoicedFill)"
          />
          <Area
            type="monotone"
            dataKey="received"
            stroke="var(--success)"
            strokeWidth={2}
            fill="url(#receivedFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
