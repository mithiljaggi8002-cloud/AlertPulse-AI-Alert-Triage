"use client";

import React, { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import type { Alert, AlertSeverity, PaginationMeta } from "@/types/alert";
import {
  getSeverityStyles,
  formatRelativeTime,
  formatDateTime,
  formatTimeOnly,
} from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api";

interface AlertsTableProps {
  alerts: Alert[];
  suppressedAlerts: Alert[];
  pagination: PaginationMeta | null;
  activeFilter: AlertSeverity | "ALL";
  onSelectFilter: (filter: AlertSeverity | "ALL") => void;
  serviceFilter?: string | null;
  onClearServiceFilter?: () => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedAlertId: string | null;
  onSelectAlert: (alert: Alert) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function AlertsTable({
  alerts,
  suppressedAlerts,
  pagination,
  activeFilter,
  onSelectFilter,
  serviceFilter,
  onClearServiceFilter,
  currentPage,
  onPageChange,
  selectedAlertId,
  onSelectAlert,
  isLoading,
  error,
  onRetry,
}: AlertsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuppressed, setShowSuppressed] = useState(false);
  const suppressedAlertIds = new Set(suppressedAlerts.map((alert) => alert.id));
  const baseAlerts = showSuppressed ? [...alerts, ...suppressedAlerts] : alerts;
  const displayedAlerts = serviceFilter
    ? baseAlerts.filter(
        (a) => a.service.toLowerCase() === serviceFilter.toLowerCase()
      )
    : baseAlerts;

  const filterTabs: Array<{ id: AlertSeverity | "ALL"; label: string }> = [
    { id: "ALL", label: "All" },
    { id: "RED", label: "Critical" },
    { id: "YELLOW", label: "Warning" },
    { id: "GREEN", label: "Recovery" },
  ];

  // Client-side quick filter within current loaded set
  const filteredAlerts = displayedAlerts.filter((alert) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      alert.service.toLowerCase().includes(q) ||
      alert.message.toLowerCase().includes(q) ||
      alert.source.toLowerCase().includes(q) ||
      (alert.host && alert.host.toLowerCase().includes(q)) ||
      (alert.aiSummary && alert.aiSummary.toLowerCase().includes(q))
    );
  });
  const emptyBecauseSuppressed =
    !showSuppressed && suppressedAlerts.length > 0 && !searchQuery.trim();

  return (
    <div className="bg-[#12151d] border border-[#1e232e] rounded flex flex-col overflow-hidden">
      {/* Table Toolbar */}
      <div className="px-3.5 py-2.5 border-b border-[#1e232e] bg-[#10131a] flex flex-wrap items-center justify-between gap-3">
        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {filterTabs.map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#1d2330] text-zinc-100 font-semibold border border-[#2a3447]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#151922] border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {serviceFilter && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/80 text-blue-300 text-xs font-mono ml-1">
              <span>Service: <strong className="text-blue-200">{serviceFilter}</strong></span>
              {onClearServiceFilter && (
                <button
                  type="button"
                  onClick={onClearServiceFilter}
                  className="hover:text-white ml-0.5 text-zinc-400"
                  title="Clear service filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter message, service, host..."
            className="w-full bg-[#0d0f14] border border-[#1e232e] rounded pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#2f384c] font-mono transition-colors"
          />
        </div>
      </div>

      {suppressedAlerts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 bg-amber-500/[0.04] px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-xs text-amber-100/80">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-300" />
            <span>
              {suppressedAlerts.length} related warning{suppressedAlerts.length === 1 ? "" : "s"} suppressed by active RED incident{suppressedAlerts.length === 1 ? "" : "s"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSuppressed((current) => !current)}
            aria-expanded={showSuppressed}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-amber-200 transition-colors hover:bg-amber-300/10 hover:text-amber-100"
          >
            {showSuppressed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showSuppressed ? "Hide warnings" : "Show warnings"}
          </button>
        </div>
      )}

      {/* Main Table Body */}
      <div className="overflow-x-auto min-h-[360px] flex flex-col justify-between">
        {/* Loading State */}
        {isLoading && (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-[#161a24]/60 border border-[#1e232e] rounded animate-pulse flex items-center px-3 gap-3"
              >
                <div className="h-3.5 w-14 bg-zinc-800 rounded"></div>
                <div className="h-3.5 w-24 bg-zinc-800 rounded"></div>
                <div className="h-3.5 flex-1 bg-zinc-800 rounded"></div>
                <div className="h-3.5 w-16 bg-zinc-800 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="my-auto py-12 px-4 flex flex-col items-center justify-center text-center">
            <div className="p-2.5 rounded bg-red-950/40 border border-red-800/60 text-red-400 mb-2.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200 font-mono">
              API Connection Error
            </h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">{error}</p>
            <p className="mt-1 text-[11px] font-mono text-zinc-500">
              Verify backend service is running and accessible at {getApiBaseUrl()}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3.5 px-3 py-1 rounded bg-[#182132] hover:bg-[#1f2b40] text-blue-400 text-xs font-mono font-medium border border-[#2a3754] transition-colors cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAlerts.length === 0 && (
          <div className="my-auto py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="p-2.5 rounded bg-[#161a24] border border-[#1e232e] text-zinc-500 mb-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200 font-mono">
              {emptyBecauseSuppressed ? "Warnings suppressed" : "No matching alerts"}
            </h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              {emptyBecauseSuppressed
                ? "Related warnings will reappear when the active RED incident is resolved."
                : searchQuery
                ? `No active alerts match query "${searchQuery}".`
                : activeFilter !== "ALL"
                ? `No alerts currently tagged as ${activeFilter}.`
                : "No telemetry alerts have been ingested yet. Send a POST to /api/alerts to trigger triage."}
            </p>
          </div>
        )}

        {/* Alert Rows */}
        {!isLoading && !error && filteredAlerts.length > 0 && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1e232e] bg-[#10131a] text-zinc-400 font-mono text-[11px] uppercase tracking-wider select-none">
                <th className="py-2 px-3 w-24">Severity</th>
                <th className="py-2 px-3 w-40">Service</th>
                <th className="py-2 px-3 w-28">Source</th>
                <th className="py-2 px-3">Message</th>
                <th className="py-2 px-3 w-24">Status</th>
                <th className="py-2 px-3 w-20 text-center">Count</th>
                <th className="py-2 px-3 w-28 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181c25]">
              {filteredAlerts.map((alert) => {
                const styles = getSeverityStyles(alert.severity);
                const isSelected = selectedAlertId === alert.id;
                const isSuppressed = suppressedAlertIds.has(alert.id);

                return (
                  <tr
                    key={alert.id}
                    onClick={() => onSelectAlert(alert)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#182132] border-l-2 border-l-blue-500"
                        : `${styles.borderLeft} hover:bg-[#151922]`
                    }`}
                  >
                    {/* Severity */}
                    <td className="py-2 px-3 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${styles.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                        {alert.severity}
                      </span>
                      {isSuppressed && (
                        <span className="mt-1 block text-[9px] font-mono uppercase text-amber-300/80">
                          Suppressed
                        </span>
                      )}
                    </td>

                    {/* Service & Host */}
                    <td className="py-2 px-3 align-top">
                      <div className="font-mono text-zinc-200 font-medium truncate max-w-[150px]">
                        {alert.service}
                      </div>
                      {alert.host && (
                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                          {alert.host}
                        </div>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-2 px-3 align-top whitespace-nowrap">
                      <span className="font-mono text-[10px] text-zinc-400 px-1.5 py-0.5 rounded bg-[#10131a] border border-[#1e232e]">
                        {alert.source}
                      </span>
                    </td>

                    {/* Message */}
                    <td className="py-2 px-3 align-top max-w-md">
                      <div className="text-zinc-200 leading-snug line-clamp-1">
                        {alert.message}
                      </div>
                      {alert.aiSummary && (
                        <div className="text-[11px] text-zinc-400 font-sans line-clamp-1 mt-0.5">
                          <span className="text-blue-400 font-mono text-[10px] mr-1">AI</span>
                          {alert.aiSummary}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 align-top whitespace-nowrap">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#10131a] text-zinc-400 border border-[#1e232e]">
                        {alert.status}
                      </span>
                    </td>

                    {/* Occurrence Count */}
                    <td className="py-2 px-3 align-top text-center whitespace-nowrap">
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          alert.occurrenceCount > 1
                            ? "text-amber-400 font-semibold"
                            : "text-zinc-500"
                        }`}
                      >
                        {alert.occurrenceCount > 1 ? `${alert.occurrenceCount}x` : "1"}
                      </span>
                    </td>

                    {/* Last Seen */}
                    <td className="py-2 px-3 align-top text-right text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                      <span title={formatDateTime(alert.lastSeen)}>
                        {formatRelativeTime(alert.lastSeen)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-3.5 py-2 border-t border-[#1e232e] bg-[#10131a] flex items-center justify-between text-xs font-mono text-zinc-400">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 rounded bg-[#141721] hover:bg-[#1c2230] border border-[#222736] text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="px-2 text-zinc-300">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1 rounded bg-[#141721] hover:bg-[#1c2230] border border-[#222736] text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
