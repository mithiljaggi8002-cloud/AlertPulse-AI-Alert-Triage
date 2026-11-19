"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { Sidebar, type NavTab } from "@/components/Sidebar";
import { OperationalMetrics } from "@/components/OperationalMetrics";
import { AlertsTable } from "@/components/AlertsTable";
import { AlertDetailDrawer } from "@/components/AlertDetailDrawer";
import { AlertSimulatorModal } from "@/components/AlertSimulatorModal";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { ServicesView } from "@/components/services/ServicesView";
import { SettingsView } from "@/components/settings/SettingsView";
import { deleteAlert, fetchAlerts, fetchAlertCounts } from "@/lib/api";
import type { Alert, AlertCounts, AlertSeverity, PaginationMeta } from "@/types/alert";
import type { UserPreferences } from "@/types/service";
import { Zap, AlertTriangle, ExternalLink, X } from "lucide-react";

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeRedAlerts, setActiveRedAlerts] = useState<Alert[]>([]);
  const [criticalNotifications, setCriticalNotifications] = useState<Alert[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [counts, setCounts] = useState<AlertCounts | null>(null);
  const [activeFilter, setActiveFilter] = useState<AlertSeverity | "ALL">("ALL");
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [analyticsRefreshTrigger, setAnalyticsRefreshTrigger] = useState<number>(0);
  const [preferences, setPreferences] = useState<UserPreferences>({
    refreshInterval: 10,
    defaultSeverity: "ALL",
  });
  const knownRedAlertIds = useRef<Set<string> | null>(null);
  const notifiedRedAlertIds = useRef(new Set<string>());

  // Hydrate preferences from localStorage on initial client mount
  useEffect(() => {
    try {
      const savedInterval = localStorage.getItem("alertpulse_refresh_interval");
      const savedSeverity = localStorage.getItem("alertpulse_default_severity");
      const parsedInterval = savedInterval ? parseInt(savedInterval, 10) : 10;
      const validInterval: 3 | 5 | 10 =
        parsedInterval === 3 || parsedInterval === 5 || parsedInterval === 10
          ? (parsedInterval as 3 | 5 | 10)
          : 10;
      const validSeverity =
        savedSeverity === "RED" ||
        savedSeverity === "YELLOW" ||
        savedSeverity === "GREEN" ||
        savedSeverity === "ALL"
          ? (savedSeverity as "ALL" | "RED" | "YELLOW" | "GREEN")
          : "ALL";

      setPreferences({
        refreshInterval: validInterval,
        defaultSeverity: validSeverity,
      });

      if (validSeverity !== "ALL") {
        setActiveFilter(validSeverity);
      }
    } catch (e) {
      console.warn("Could not read preferences from localStorage:", e);
    }
  }, []);

  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updated };
      try {
        if (updated.refreshInterval !== undefined) {
          localStorage.setItem("alertpulse_refresh_interval", String(updated.refreshInterval));
        }
        if (updated.defaultSeverity !== undefined) {
          localStorage.setItem("alertpulse_default_severity", updated.defaultSeverity);
          setActiveFilter(updated.defaultSeverity);
        }
      } catch (e) {
        console.warn("Could not persist preferences to localStorage:", e);
      }
      return next;
    });
  };

  const notifyCriticalAlert = useCallback((alert: Alert) => {
    if (alert.severity !== "RED" || notifiedRedAlertIds.current.has(alert.id)) return;
    notifiedRedAlertIds.current.add(alert.id);
    setCriticalNotifications((current) => [
      alert,
      ...current.filter((notification) => notification.id !== alert.id),
    ]);
  }, []);

  const dismissCriticalNotification = (alertId: string) => {
    setCriticalNotifications((current) =>
      current.filter((notification) => notification.id !== alertId),
    );
  };

  // Main data loader
  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const [alertsResponse, countsData, redAlertsResponse] = await Promise.all([
          fetchAlerts({
            severity: activeFilter === "ALL" ? undefined : activeFilter,
            page: currentPage,
            limit: 20,
          }),
          fetchAlertCounts().catch((err) => {
            console.warn("Failed to fetch summary counts:", err);
            return null;
          }),
          fetchAlerts({ severity: "RED", limit: 100 }),
        ]);

        setAlerts(alertsResponse.data);
        const activeRedIncidents = redAlertsResponse.data.filter(
          (alert) => alert.status.toUpperCase() !== "RESOLVED",
        );
        setActiveRedAlerts(activeRedIncidents);

        if (knownRedAlertIds.current === null) {
          knownRedAlertIds.current = new Set(
            activeRedIncidents.map((alert) => alert.id),
          );
        } else {
          for (const alert of activeRedIncidents) {
            if (!knownRedAlertIds.current.has(alert.id)) notifyCriticalAlert(alert);
            knownRedAlertIds.current.add(alert.id);
          }
        }

        setPagination(alertsResponse.pagination);
        if (countsData) setCounts(countsData);

        // If an alert was selected, refresh its reference
        if (selectedAlert) {
          const updated = alertsResponse.data.find((a) => a.id === selectedAlert.id);
          if (updated) setSelectedAlert(updated);
        }

        setLastSyncedAt(new Date());
      } catch (err) {
        console.error("Dashboard data load error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading telemetry alerts."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeFilter, currentPage, selectedAlert, notifyCriticalAlert]
  );

  // Initial load and when filters/page change
  useEffect(() => {
    loadData(true);
  }, [activeFilter, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh cadence governed by user preference
  useEffect(() => {
    if (!autoRefresh) return;
    const intervalMs = (preferences.refreshInterval || 10) * 1000;
    const interval = setInterval(() => {
      loadData(false);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData, preferences.refreshInterval]);

  const handleSelectFilter = (filter: AlertSeverity | "ALL") => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    // When switching back to overview/alerts, do a fresh load
    if (tab === "overview" || tab === "alerts") {
      loadData(false);
    }
  };

  const handleNavigateToServiceAlerts = (serviceName?: string) => {
    if (serviceName) {
      setServiceFilter(serviceName);
    }
    setActiveTab("alerts");
  };

  const handleResolveAlert = async (alertId: string) => {
    await deleteAlert(alertId);
    setSelectedAlert((current) => (current?.id === alertId ? null : current));
    setAnalyticsRefreshTrigger((prev) => prev + 1);
    await loadData(false);
  };

  const activeRedServices = new Set(
    activeRedAlerts.map((alert) => alert.service.trim().toLowerCase()),
  );
  const suppressedAlerts = alerts.filter(
    (alert) =>
      alert.severity === "YELLOW" &&
      activeRedServices.has(alert.service.trim().toLowerCase()),
  );
  const suppressedAlertIds = new Set(suppressedAlerts.map((alert) => alert.id));
  const visibleAlerts = alerts.filter((alert) => !suppressedAlertIds.has(alert.id));

  return (
    <div className="flex h-screen overflow-hidden bg-[#090a0f] text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        activeAlertCount={counts?.total ?? 0}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top navigation bar */}
        <Header
          onRefresh={() => loadData(true)}
          isLoading={isLoading}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((prev) => !prev)}
          lastSyncedAt={lastSyncedAt}
        />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Overview Action Banner with Simulator Button */}
              <div className="p-4 rounded bg-[#10131a] border border-[#1e232e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-100 font-mono uppercase tracking-wider">
                      Operational Overview & Live Telemetry
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Live Ingestion
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                    Live operational incidents triaged with deterministic severity classification and Gemini AI root-cause analysis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-blue-500/25 border border-blue-400/40"
                  title="Open Alert Simulator to inject synthetic telemetry"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Generate Test Alert</span>
                </button>
              </div>

              <OperationalMetrics
                counts={counts}
                activeFilter={activeFilter}
                onSelectFilter={handleSelectFilter}
                isLoading={isLoading && !counts}
              />
              <AlertsTable
                alerts={visibleAlerts}
                suppressedAlerts={suppressedAlerts}
                pagination={pagination}
                activeFilter={activeFilter}
                onSelectFilter={handleSelectFilter}
                serviceFilter={serviceFilter}
                onClearServiceFilter={() => setServiceFilter(null)}
                currentPage={currentPage}
                onPageChange={(page) => setCurrentPage(page)}
                selectedAlertId={selectedAlert?.id ?? null}
                onSelectAlert={(alert) => setSelectedAlert(alert)}
                isLoading={isLoading}
                error={error}
                onRetry={() => loadData(true)}
              />
            </>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <AlertsTable
              alerts={visibleAlerts}
              suppressedAlerts={suppressedAlerts}
              pagination={pagination}
              activeFilter={activeFilter}
              onSelectFilter={handleSelectFilter}
              serviceFilter={serviceFilter}
              onClearServiceFilter={() => setServiceFilter(null)}
              currentPage={currentPage}
              onPageChange={(page) => setCurrentPage(page)}
              selectedAlertId={selectedAlert?.id ?? null}
              onSelectAlert={(alert) => setSelectedAlert(alert)}
              isLoading={isLoading}
              error={error}
              onRetry={() => loadData(true)}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <AnalyticsDashboard refreshTrigger={analyticsRefreshTrigger} />
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <ServicesView
              onNavigateToAlerts={handleNavigateToServiceAlerts}
              refreshTrigger={analyticsRefreshTrigger}
            />
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <SettingsView
              preferences={preferences}
              onUpdatePreferences={handleUpdatePreferences}
            />
          )}
        </main>
      </div>

      {/* Alert Detail Slide-over Drawer */}
      <AlertDetailDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onResolve={handleResolveAlert}
      />

      {/* Alert Telemetry Simulator Modal */}
      <AlertSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onAlertIngested={(injectedAlert) => {
          if (!injectedAlert.deduplicated && injectedAlert.data.severity === "RED") {
            notifyCriticalAlert(injectedAlert.data);
          }
          if (activeFilter !== "ALL" && activeFilter !== injectedAlert.data.severity) {
            setActiveFilter("ALL");
          }
          loadData(false);
          setAnalyticsRefreshTrigger((prev) => prev + 1);
        }}
      />

      {/* Critical notifications */}
      <div
        aria-label="Critical alert notifications"
        aria-live="assertive"
        className="fixed left-3 right-3 top-3 z-[70] flex max-h-[calc(100dvh-1.5rem)] flex-col gap-2 overflow-y-auto sm:left-auto sm:right-5 sm:top-5 sm:w-[min(26rem,calc(100vw-2.5rem))]"
      >
        {criticalNotifications.map((alert) => (
          <div
            key={alert.id}
            role="alert"
            className="rounded-lg border border-red-500/40 bg-[#171014] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.55)] ring-1 ring-red-400/10"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-md bg-red-500/15 p-2 text-red-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-300">
                  Critical alert · RED
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-100">
                  {alert.service}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                  {alert.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissCriticalNotification(alert.id)}
                aria-label="Dismiss critical alert notification"
                className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedAlert(alert);
                setActiveTab("alerts");
                dismissCriticalNotification(alert.id);
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-200 transition-colors hover:text-white"
            >
              Review incident <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
