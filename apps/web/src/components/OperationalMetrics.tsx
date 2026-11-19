"use client";

import React from "react";
import type { AlertCounts, AlertSeverity } from "@/types/alert";

interface OperationalMetricsProps {
  counts: AlertCounts | null;
  activeFilter: AlertSeverity | "ALL";
  onSelectFilter: (filter: AlertSeverity | "ALL") => void;
  isLoading: boolean;
}

export function OperationalMetrics({
  counts,
  activeFilter,
  onSelectFilter,
  isLoading,
}: OperationalMetricsProps) {
  const items = [
    {
      id: "ALL" as const,
      label: "Total Alerts",
      count: counts?.total ?? 0,
      severityDot: "bg-zinc-400",
      activeBg: "bg-[#182132] border-[#2a3754] text-zinc-100",
      inactiveBg: "bg-[#12151d] border-[#1e232e] text-zinc-400 hover:border-[#282e3c]",
      countClass: "text-zinc-100",
    },
    {
      id: "RED" as const,
      label: "Critical (RED)",
      count: counts?.red ?? 0,
      severityDot: "bg-red-500",
      activeBg: "bg-red-950/40 border-red-800/80 text-red-200",
      inactiveBg: "bg-[#12151d] border-[#1e232e] text-zinc-400 hover:border-red-900/50",
      countClass: counts?.red ? "text-red-400" : "text-zinc-500",
    },
    {
      id: "YELLOW" as const,
      label: "Warnings (YELLOW)",
      count: counts?.yellow ?? 0,
      severityDot: "bg-amber-500",
      activeBg: "bg-amber-950/40 border-amber-800/80 text-amber-200",
      inactiveBg: "bg-[#12151d] border-[#1e232e] text-zinc-400 hover:border-amber-900/50",
      countClass: counts?.yellow ? "text-amber-400" : "text-zinc-500",
    },
    {
      id: "GREEN" as const,
      label: "Recovery (GREEN)",
      count: counts?.green ?? 0,
      severityDot: "bg-emerald-500",
      activeBg: "bg-emerald-950/40 border-emerald-800/80 text-emerald-200",
      inactiveBg: "bg-[#12151d] border-[#1e232e] text-zinc-400 hover:border-emerald-900/50",
      countClass: counts?.green ? "text-emerald-400" : "text-zinc-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {items.map((item) => {
        const isSelected = activeFilter === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectFilter(item.id)}
            className={`p-3 rounded border text-left flex items-center justify-between transition-colors cursor-pointer ${
              isSelected ? item.activeBg : item.inactiveBg
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${item.severityDot}`} />
              <span className="text-xs font-medium tracking-tight truncate">
                {item.label}
              </span>
            </div>

            <div className="font-mono text-lg font-bold tabular-nums pl-2">
              {isLoading && !counts ? (
                <span className="text-zinc-600 animate-pulse text-sm">--</span>
              ) : (
                <span className={item.countClass}>
                  {item.count.toLocaleString()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
