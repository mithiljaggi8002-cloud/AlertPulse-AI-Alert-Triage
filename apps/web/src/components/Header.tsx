"use client";

import React from "react";
import { Activity, Clock, RefreshCw } from "lucide-react";

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  lastSyncedAt?: Date | null;
  refreshInterval?: number;
}

export function Header({
  onRefresh,
  isLoading,
  autoRefresh,
  onToggleAutoRefresh,
  lastSyncedAt,
  refreshInterval = 10,
}: HeaderProps) {
  const formattedSyncTime = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString(undefined, {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <header className="h-14 bg-[#10131a] border-b border-[#1e232e] px-4 sm:px-6 flex items-center justify-between gap-4 select-none">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500">Incident Triage</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-200 font-semibold">Active Alerts</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161a23] border border-[#232936] text-[11px] font-mono text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Ingestion Pipeline Live</span>
        </div>
      </div>

      {/* Right: Sync Controls & Status */}
      <div className="flex items-center gap-2.5">
        {formattedSyncTime && (
          <span className="hidden lg:inline text-[11px] font-mono text-zinc-500">
            Synced: {formattedSyncTime}
          </span>
        )}

        {/* Auto Refresh Toggle */}
        <button
          type="button"
          onClick={onToggleAutoRefresh}
          className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
            autoRefresh
              ? "bg-[#182132] text-blue-400 border-[#2a3754]"
              : "bg-[#13161f] text-zinc-400 border-[#1e232e] hover:text-zinc-300"
          }`}
          title="Toggle 10-second background polling"
        >
          <Activity className="h-3 w-3" />
          <span>Auto: {autoRefresh ? `${refreshInterval}s` : "Off"}</span>
        </button>

        {/* Manual Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-[#161a23] hover:bg-[#1d222e] text-zinc-200 text-xs font-mono font-medium border border-[#262c3b] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh alerts immediately"
        >
          <RefreshCw
            className={`h-3 w-3 text-zinc-400 ${
              isLoading ? "animate-spin text-blue-400" : ""
            }`}
          />
          <span>Sync</span>
        </button>
      </div>
    </header>
  );
}
