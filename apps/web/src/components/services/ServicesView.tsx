"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Server,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  ArrowRight,
  Clock,
  Layers,
  Activity,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { fetchServicesOverview } from "@/lib/api";
import type {
  ServiceSummary,
  ServiceCondition,
  ServicesOverviewData,
} from "@/types/service";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";

interface ServicesViewProps {
  onNavigateToAlerts: (serviceName?: string) => void;
  refreshTrigger?: number;
}

export function ServicesView({
  onNavigateToAlerts,
  refreshTrigger = 0,
}: ServicesViewProps) {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [summary, setSummary] = useState<ServicesOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<ServiceCondition | "ALL">(
    "ALL"
  );

  const loadServices = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const res = await fetchServicesOverview();
      setServices(res.data);
      setSummary(res.summary);
    } catch (err) {
      console.error("Failed to load services overview:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to communicate with /api/services"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices(true);
  }, [loadServices, refreshTrigger]);

  const filteredServices = services.filter((s) => {
    const matchesFilter =
      activeFilter === "ALL" ? true : s.condition === activeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      s.service.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getConditionBadge = (condition: ServiceCondition) => {
    switch (condition) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-950/60 text-red-300 border border-red-800/80">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            CRITICAL
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            DEGRADED
          </span>
        );
      case "NO RECENT INCIDENTS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            NO RECENT INCIDENTS
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="p-4 rounded bg-[#10131a] border border-[#1e232e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-blue-400" />
              Service Inventory & Health Telemetry
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Live PostgreSQL
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Real-time operational status derived strictly from alert activity.
            No unverified claims of &quot;healthy&quot; without explicit probes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadServices(true)}
          disabled={isLoading}
          className="self-start sm:self-auto px-3 py-1.5 rounded bg-[#161a23] hover:bg-[#1f2533] text-zinc-300 hover:text-zinc-100 text-xs font-mono font-medium border border-[#262c3b] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh services from database"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Monitored Services */}
        <div className="p-3.5 rounded bg-[#12151d] border border-[#1e232e]">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Total Services</span>
            <Server className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-100">
            {summary?.totalServices ?? (isLoading ? "..." : 0)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            Tracked in PostgreSQL
          </div>
        </div>

        {/* Critical Services */}
        <div className="p-3.5 rounded bg-[#12151d] border border-red-950/60 hover:border-red-900/50 transition-colors">
          <div className="flex items-center justify-between text-red-300 text-xs font-mono">
            <span>Critical Condition</span>
            <AlertOctagon className="h-3.5 w-3.5 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-red-400">
            {summary?.criticalServices ?? (isLoading ? "..." : 0)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            Active RED alerts present
          </div>
        </div>

        {/* Degraded Services */}
        <div className="p-3.5 rounded bg-[#12151d] border border-amber-950/60 hover:border-amber-900/50 transition-colors">
          <div className="flex items-center justify-between text-amber-300 text-xs font-mono">
            <span>Degraded Condition</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            {summary?.degradedServices ?? (isLoading ? "..." : 0)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            Active YELLOW alerts only
          </div>
        </div>

        {/* No Recent Incidents */}
        <div className="p-3.5 rounded bg-[#12151d] border border-[#1e232e]">
          <div className="flex items-center justify-between text-zinc-300 text-xs font-mono">
            <span>No Recent Incidents</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-100">
            {summary?.noRecentIncidentsServices ?? (isLoading ? "..." : 0)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            Zero active RED / YELLOW
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#12151d] border border-[#1e232e] rounded overflow-hidden">
        {/* Toolbar */}
        <div className="px-3.5 py-2.5 border-b border-[#1e232e] bg-[#10131a] flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {(
              [
                { id: "ALL", label: "All Services" },
                { id: "CRITICAL", label: "Critical" },
                { id: "DEGRADED", label: "Degraded" },
                { id: "NO RECENT INCIDENTS", label: "No Incidents" },
              ] as const
            ).map((tab) => {
              const isSelected = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
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
          </div>

          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search service name..."
              className="w-full pl-8 pr-3 py-1 bg-[#161a23] border border-[#232938] rounded text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
            <span className="text-xs text-zinc-400 font-mono">
              Aggregating PostgreSQL service telemetry...
            </span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-8 text-center space-y-3">
            <AlertOctagon className="h-6 w-6 text-red-400 mx-auto" />
            <div className="text-xs font-mono text-red-300 font-semibold">
              Failed to load services overview
            </div>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => loadServices(true)}
              className="px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-200 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredServices.length === 0 && (
          <div className="py-16 text-center space-y-2">
            <Server className="h-8 w-8 text-zinc-600 mx-auto" />
            <div className="text-xs font-mono text-zinc-300 font-medium">
              No matching services found
            </div>
            <p className="text-[11px] text-zinc-500 font-sans max-w-md mx-auto">
              {searchQuery
                ? `No service name matches "${searchQuery}".`
                : "No telemetry alerts have been registered in PostgreSQL yet. Ingest alerts through the Alert Simulator to populate services."}
            </p>
          </div>
        )}

        {/* Services Table */}
        {!isLoading && !error && filteredServices.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e232e] bg-[#10131a] text-zinc-400 font-mono text-[11px] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3.5">Service Name</th>
                  <th className="py-2.5 px-3.5 w-44">Derived Condition</th>
                  <th className="py-2.5 px-3.5 w-32 text-center">Active Incidents</th>
                  <th className="py-2.5 px-3.5 w-32 text-center">Total Alerts</th>
                  <th className="py-2.5 px-3.5 w-40">Severity Breakdown</th>
                  <th className="py-2.5 px-3.5 w-32 text-right">Last Alert</th>
                  <th className="py-2.5 px-3.5 w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181c25]">
                {filteredServices.map((service) => {
                  return (
                    <tr
                      key={service.service}
                      onClick={() => onNavigateToAlerts(service.service)}
                      className="hover:bg-[#151922] transition-colors cursor-pointer group"
                    >
                      {/* Service Name */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded bg-[#161a23] border border-[#262c3b] flex items-center justify-center shrink-0 text-zinc-400 group-hover:text-blue-400 group-hover:border-blue-900/50 transition-colors">
                            <Server className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-zinc-100 font-semibold group-hover:text-blue-300 transition-colors">
                              {service.service}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Derived Condition */}
                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        {getConditionBadge(service.condition)}
                      </td>

                      {/* Active Incidents */}
                      <td className="py-3 px-3.5 align-middle text-center">
                        <span
                          className={`font-mono font-semibold text-xs tabular-nums px-2 py-0.5 rounded ${
                            service.activeIncidents > 0
                              ? service.condition === "CRITICAL"
                                ? "bg-red-950/40 text-red-300 border border-red-900/50"
                                : "bg-amber-950/40 text-amber-300 border border-amber-900/50"
                              : "text-zinc-500"
                          }`}
                        >
                          {service.activeIncidents}
                        </span>
                      </td>

                      {/* Total Alerts */}
                      <td className="py-3 px-3.5 align-middle text-center">
                        <span className="font-mono text-zinc-300 tabular-nums">
                          {service.totalAlerts}
                        </span>
                      </td>

                      {/* Severity Breakdown */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          {service.redCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-900/50" title={`${service.redCount} Critical alerts`}>
                              {service.redCount} RED
                            </span>
                          )}
                          {service.yellowCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/50" title={`${service.yellowCount} Warning alerts`}>
                              {service.yellowCount} YEL
                            </span>
                          )}
                          {service.greenCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/50" title={`${service.greenCount} Recovery alerts`}>
                              {service.greenCount} GRN
                            </span>
                          )}
                          {service.redCount === 0 &&
                            service.yellowCount === 0 &&
                            service.greenCount === 0 && (
                              <span className="text-zinc-600">—</span>
                            )}
                        </div>
                      </td>

                      {/* Last Alert Timestamp */}
                      <td className="py-3 px-3.5 align-middle text-right text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {service.lastAlertAt ? (
                          <span title={formatDateTime(service.lastAlertAt)}>
                            {formatRelativeTime(service.lastAlertAt)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 align-middle text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 group-hover:text-blue-400 transition-colors">
                          <span>Alerts</span>
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
