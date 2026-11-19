"use client";

import React from "react";
import type { AnalyticsKeyMetrics } from "@/types/alert";

interface KeyMetricsRowProps {
  metrics: AnalyticsKeyMetrics;
}

export function KeyMetricsRow({ metrics }: KeyMetricsRowProps) {
  const tiles = [
    {
      label: "Total Alerts",
      value: metrics.total,
      color: "text-zinc-100",
      dot: "bg-zinc-400",
    },
    {
      label: "Critical (RED)",
      value: metrics.critical,
      color: metrics.critical > 0 ? "text-red-400" : "text-zinc-500",
      dot: "bg-red-500",
    },
    {
      label: "Duplicate Events",
      value: metrics.duplicates,
      color: metrics.duplicates > 0 ? "text-amber-400" : "text-zinc-500",
      dot: "bg-amber-500",
    },
    {
      label: "Active Incidents",
      value: metrics.activeIncidents,
      color: metrics.activeIncidents > 0 ? "text-blue-400" : "text-zinc-500",
      dot: "bg-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="p-3 rounded border border-[#1e232e] bg-[#12151d] flex items-center justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 rounded-full shrink-0 ${tile.dot}`} />
            <span className="text-xs text-zinc-400 font-medium tracking-tight truncate">
              {tile.label}
            </span>
          </div>
          <span className={`font-mono text-lg font-bold tabular-nums pl-2 ${tile.color}`}>
            {tile.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
