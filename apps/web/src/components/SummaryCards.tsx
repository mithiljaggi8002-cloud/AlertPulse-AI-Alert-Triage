"use client";

import React from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { AlertCounts, AlertSeverity } from "@/types/alert";

interface SummaryCardsProps {
  counts: AlertCounts | null;
  activeFilter: AlertSeverity | "ALL";
  onSelectFilter: (filter: AlertSeverity | "ALL") => void;
  isLoading: boolean;
}

export function SummaryCards({
  counts,
  activeFilter,
  onSelectFilter,
  isLoading,
}: SummaryCardsProps) {
  const cards = [
    {
      id: "ALL" as const,
      title: "Total Alerts",
      count: counts?.total ?? 0,
      icon: Activity,
      color: "zinc",
      borderActive: "border-indigo-500/60 ring-1 ring-indigo-500/40",
      borderInactive: "border-zinc-800 hover:border-zinc-700",
      bgActive: "bg-indigo-950/20",
      iconColor: "text-indigo-400",
      badgeBg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
      description: "Across all monitored services",
    },
    {
      id: "RED" as const,
      title: "Critical (RED)",
      count: counts?.red ?? 0,
      icon: AlertOctagon,
      color: "red",
      borderActive: "border-rose-500/60 ring-1 ring-rose-500/40",
      borderInactive: "border-zinc-800 hover:border-rose-900/60",
      bgActive: "bg-rose-950/20",
      iconColor: "text-rose-400",
      badgeBg: "bg-rose-500/10 text-rose-300 border-rose-500/20",
      description: "Outages, crashes & high thresholds",
    },
    {
      id: "YELLOW" as const,
      title: "Warning (YELLOW)",
      count: counts?.yellow ?? 0,
      icon: AlertTriangle,
      color: "yellow",
      borderActive: "border-amber-500/60 ring-1 ring-amber-500/40",
      borderInactive: "border-zinc-800 hover:border-amber-900/60",
      bgActive: "bg-amber-950/20",
      iconColor: "text-amber-400",
      badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      description: "Latency spikes & elevated errors",
    },
    {
      id: "GREEN" as const,
      title: "Healthy / Resolved",
      count: counts?.green ?? 0,
      icon: CheckCircle2,
      color: "green",
      borderActive: "border-emerald-500/60 ring-1 ring-emerald-500/40",
      borderInactive: "border-zinc-800 hover:border-emerald-900/60",
      bgActive: "bg-emerald-950/20",
      iconColor: "text-emerald-400",
      badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      description: "Recovered & normal telemetry",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeFilter === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter(c.id)}
            className={`relative text-left p-4 rounded-xl border bg-zinc-900/60 backdrop-blur-sm transition-all duration-200 cursor-pointer ${
              isSelected ? `${c.borderActive} ${c.bgActive}` : c.borderInactive
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                {c.title}
              </span>
              <div
                className={`p-2 rounded-lg border bg-zinc-950/80 ${c.badgeBg}`}
              >
                <Icon className={`h-4 w-4 ${c.iconColor}`} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded"></div>
              ) : (
                <span className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                  {c.count.toLocaleString()}
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-zinc-500 truncate">
              {c.description}
            </p>

            {isSelected && (
              <span className="absolute bottom-1 right-2 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Filter Active
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
