"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SeverityCount } from "@/types/alert";

const SEVERITY_COLORS: Record<string, string> = {
  RED: "#ef4444",
  YELLOW: "#f59e0b",
  GREEN: "#10b981",
};

interface SeverityDonutProps {
  data: SeverityCount[];
}

export function SeverityDonut({ data }: SeverityDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-xs font-mono">
        No severity data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="severity"
        >
          {data.map((entry) => (
            <Cell
              key={entry.severity}
              fill={SEVERITY_COLORS[entry.severity] ?? "#6b7280"}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#13161f",
            border: "1px solid #1e232e",
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#d4d4d8",
          }}
          formatter={(value, name) => [value, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span style={{ color: "#a1a1aa", fontSize: "11px", fontFamily: "monospace" }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
