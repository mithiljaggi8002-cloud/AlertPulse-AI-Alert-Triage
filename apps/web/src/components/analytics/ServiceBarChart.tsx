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
import type { ServiceCount } from "@/types/alert";

interface ServiceBarChartProps {
  data: ServiceCount[];
}

export function ServiceBarChart({ data }: ServiceBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-xs font-mono">
        No service data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
        />
        <YAxis
          type="category"
          dataKey="service"
          width={120}
          tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={false}
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
        <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={16}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={index === 0 ? "#3b82f6" : "#1d4ed8"}
              opacity={1 - index * 0.06}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
