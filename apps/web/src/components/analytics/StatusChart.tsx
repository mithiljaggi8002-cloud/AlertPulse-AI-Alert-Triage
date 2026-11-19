"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { StatusCount } from "@/types/alert";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#ef4444",
  ACKNOWLEDGED: "#f59e0b",
  RESOLVED: "#10b981",
};

interface StatusChartProps {
  data: StatusCount[];
}

export function StatusChart({ data }: StatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-mono">
        No status data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
      >
        <XAxis
          dataKey="status"
          tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#52525b", fontSize: 9, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={false}
          width={24}
        />
        <Tooltip
          contentStyle={{
            background: "#13161f",
            border: "1px solid #1e232e",
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#d4d4d8",
          }}
          cursor={{ fill: "#1e232e" }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
