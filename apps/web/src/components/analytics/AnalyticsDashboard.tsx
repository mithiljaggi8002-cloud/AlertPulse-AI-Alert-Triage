"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, BarChart2, AlertCircle } from "lucide-react";
import { fetchAnalyticsOverview } from "@/lib/api";
import type { AnalyticsOverviewData } from "@/types/alert";
import { KeyMetricsRow } from "@/components/analytics/KeyMetricsRow";
import { SeverityDonut } from "@/components/analytics/SeverityDonut";
import { ServiceBarChart } from "@/components/analytics/ServiceBarChart";
import { AlertTimeline } from "@/components/analytics/AlertTimeline";
import { StatusChart } from "@/components/analytics/StatusChart";

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#10131a] border border-[#1e232e] rounded p-4 space-y-3">
      <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </span>
      {children}
    </div>
  );
}

export function AnalyticsDashboard({
  refreshTrigger,
}: {
  refreshTrigger?: number;
} = {}) {
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAnalyticsOverview();
      if (res.success) {
        setData(res.data);
      } else {
        setError("Analytics API returned an unsuccessful response.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics data."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-zinc-400" />
            Analytics Overview
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded border border-[#1e232e] bg-[#12151d] animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded border border-[#1e232e] bg-[#10131a] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-red-500/60" />
        <p className="text-sm text-zinc-400">{error}</p>
        <button
          onClick={loadAnalytics}
          className="px-3 py-1.5 rounded bg-[#161a23] hover:bg-[#1d222e] text-zinc-200 text-xs font-mono border border-[#262c3b] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-zinc-400" />
          Analytics Overview
        </span>
        <button
          onClick={loadAnalytics}
          className="px-2.5 py-1 rounded bg-[#161a23] hover:bg-[#1d222e] text-zinc-300 text-xs font-mono border border-[#262c3b] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="h-3 w-3 text-zinc-400" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <KeyMetricsRow metrics={data.keyMetrics} />

      {/* Alert Volume Timeline */}
      <ChartPanel title="Alert Volume — Last 48 Hours">
        <AlertTimeline data={data.timeline} />
      </ChartPanel>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPanel title="Severity Distribution">
          <SeverityDonut data={data.severityDistribution} />
        </ChartPanel>

        <ChartPanel title="Incident Status Breakdown">
          <StatusChart data={data.statusDistribution} />
        </ChartPanel>
      </div>

      {/* Service Distribution */}
      <ChartPanel title="Top Services by Alert Count">
        <ServiceBarChart data={data.serviceDistribution} />
      </ChartPanel>
    </div>
  );
}
