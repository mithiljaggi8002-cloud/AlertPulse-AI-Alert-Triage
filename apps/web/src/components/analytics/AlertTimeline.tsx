"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TimelineBucket } from "@/types/alert";

interface AlertTimelineProps {
  data: TimelineBucket[];
}

function formatBucketLabel(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function AlertTimeline({ data }: AlertTimelineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-xs font-mono">
        No timeline data in the last 48 hours
      </div>
    );
  }

  // Sort ascending for display (data comes DESC from API)
  const sorted = [...data].sort(
    (a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime()
  );

  const chartData = sorted.map((row) => ({
    label: formatBucketLabel(row.bucket),
    count: row.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
      >
        <defs>
          <linearGradient id="alertAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="#1e232e"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "#52525b", fontSize: 9, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#52525b", fontSize: 9, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={false}
          width={28}
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
          cursor={{ stroke: "#3b82f6", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={1.5}
          fill="url(#alertAreaGradient)"
          dot={false}
          activeDot={{ r: 3, fill: "#3b82f6", stroke: "transparent" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
