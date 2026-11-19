"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Activity,
  Sparkles,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  ShieldCheck,
  Check,
  RotateCcw,
  Info,
} from "lucide-react";
import { checkBackendHealth } from "@/lib/api";
import type { BackendHealthResponse, UserPreferences } from "@/types/service";

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
}

export function SettingsView({
  preferences,
  onUpdatePreferences,
}: SettingsViewProps) {
  // Backend & Gemini health state
  const [healthData, setHealthData] = useState<BackendHealthResponse | null>(
    null
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const probeHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    setHealthError(null);
    try {
      const res = await checkBackendHealth();
      setHealthData(res.data);
      setLatencyMs(res.latencyMs);
      setLastCheckedAt(new Date());
    } catch (err) {
      console.error("Health probe failed:", err);
      setHealthError(
        err instanceof Error ? err.message : "Unable to reach backend /health"
      );
      setLatencyMs(null);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    probeHealth();
  }, [probeHealth]);

  const handleSetInterval = (interval: 3 | 5 | 10) => {
    onUpdatePreferences({ refreshInterval: interval });
    triggerSaveFeedback(`Auto-refresh interval set to ${interval} seconds`);
  };

  const handleSetDefaultSeverity = (
    severity: "ALL" | "RED" | "YELLOW" | "GREEN"
  ) => {
    onUpdatePreferences({ defaultSeverity: severity });
    triggerSaveFeedback(`Default severity filter set to ${severity}`);
  };

  const handleResetPreferences = () => {
    onUpdatePreferences({
      refreshInterval: 10,
      defaultSeverity: "ALL",
    });
    triggerSaveFeedback("Preferences reset to defaults");
  };

  const triggerSaveFeedback = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => {
      setSaveBanner((current) => (current === msg ? null : current));
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="p-4 rounded bg-[#10131a] border border-[#1e232e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <Settings className="h-3.5 w-3.5 text-blue-400" />
              Application Preferences & Infrastructure Diagnostics
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Live Config
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Configure telemetry polling cadence, view connectivity diagnostics, and manage local preferences.
          </p>
        </div>

        {saveBanner && (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-mono animate-in fade-in">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>{saveBanner}</span>
          </div>
        )}
      </div>

      {/* 1. Infrastructure Connectivity & AI Engine */}
      <div className="bg-[#12151d] border border-[#1e232e] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e232e] bg-[#10131a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-100">
              Infrastructure Connectivity & Diagnostics
            </h3>
          </div>
          <button
            type="button"
            onClick={probeHealth}
            disabled={isCheckingHealth}
            className="px-2.5 py-1 rounded bg-[#161a23] hover:bg-[#1f2533] text-zinc-300 text-xs font-mono font-medium border border-[#262c3b] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${isCheckingHealth ? "animate-spin" : ""}`}
            />
            <span>Test Connection</span>
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Backend Connection Card */}
          <div className="p-3.5 rounded bg-[#0f1219] border border-[#1e232e] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-zinc-400" />
                Backend API Status
              </span>
              {!isCheckingHealth && !healthError ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  ONLINE
                </span>
              ) : isCheckingHealth ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 text-blue-400 border border-blue-800/80">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  PROBING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-950/60 text-red-300 border border-red-800/80">
                  <AlertTriangle className="h-2.5 w-2.5 text-red-400" />
                  DISCONNECTED
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Endpoint:</span>
                <span className="text-zinc-200">GET /health</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Latency:</span>
                <span className={latencyMs !== null ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                  {latencyMs !== null ? `${latencyMs} ms` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Last Verified:</span>
                <span className="text-zinc-300 text-[11px]">
                  {lastCheckedAt
                    ? lastCheckedAt.toLocaleTimeString()
                    : "Not verified yet"}
                </span>
              </div>
            </div>

            {healthError && (
              <div className="p-2.5 rounded bg-red-950/30 border border-red-900/60 text-red-300 text-[11px] font-mono">
                {healthError}
              </div>
            )}
          </div>

          {/* Gemini AI Status Card */}
          <div className="p-3.5 rounded bg-[#0f1219] border border-[#1e232e] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Gemini AI Triage Engine
              </span>
              {healthData?.gemini.status === "AVAILABLE" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                  AVAILABLE
                </span>
              ) : healthData?.gemini.status === "CONFIGURED" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/80">
                  <CheckCircle2 className="h-2.5 w-2.5 text-blue-400" />
                  CONFIGURED
                </span>
              ) : healthData?.gemini.status === "UNAVAILABLE" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-950/60 text-red-300 border border-red-800/80">
                  <AlertTriangle className="h-2.5 w-2.5 text-red-400" />
                  UNAVAILABLE
                </span>
              ) : isCheckingHealth ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 text-blue-400 border border-blue-800/80">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  CHECKING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80">
                  UNCONFIGURED
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Model:</span>
                <span className="text-zinc-200">
                  {healthData?.gemini.model || "gemini-3.5-flash-lite"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Credentials:</span>
                <span className="text-zinc-200">
                  {healthData?.gemini.configured ? "CONFIGURED (Key present)" : "UNCONFIGURED"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Connectivity:</span>
                <span className="text-zinc-200">
                  {healthData?.gemini.status === "AVAILABLE"
                    ? "AVAILABLE (Triage verified)"
                    : healthData?.gemini.status === "CONFIGURED"
                    ? "CONFIGURED (Awaiting ingestion)"
                    : healthData?.gemini.status === "UNAVAILABLE"
                    ? "UNAVAILABLE (Upstream error)"
                    : "UNCONFIGURED"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Key Security:</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Encrypted Backend
                </span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-sans">
              API credentials are kept exclusively on the server process and are never exposed or transmitted to the client.
            </p>
          </div>
        </div>
      </div>

      {/* 2. User Preferences (Persisted across refreshes) */}
      <div className="bg-[#12151d] border border-[#1e232e] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e232e] bg-[#10131a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-100">
              Telemetry Polling & View Defaults
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetPreferences}
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Refresh Cadence Setting */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-zinc-200 block">
              Auto-Refresh Cadence
            </label>
            <p className="text-[11px] text-zinc-400 font-sans">
              Interval between automated telemetry polling requests. Persisted locally in your browser.
            </p>

            <div className="flex items-center gap-2 pt-1">
              {([3, 5, 10] as const).map((interval) => {
                const isSelected = preferences.refreshInterval === interval;
                return (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => handleSetInterval(interval)}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-sm shadow-blue-500/20"
                        : "bg-[#161a23] hover:bg-[#1e232f] border-[#262c3b] text-zinc-300"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    <span>{interval} Seconds</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#1e232e] pt-4 space-y-2">
            <label className="text-xs font-mono font-medium text-zinc-200 block">
              Default Severity Filter on Launch
            </label>
            <p className="text-[11px] text-zinc-400 font-sans">
              The primary severity tier displayed when opening the dashboard or reloading the application.
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {(
                [
                  { id: "ALL", label: "All Alerts", color: "text-zinc-200" },
                  { id: "RED", label: "Critical Only (RED)", color: "text-red-400" },
                  { id: "YELLOW", label: "Warning Only (YELLOW)", color: "text-amber-400" },
                  { id: "GREEN", label: "Recovery Only (GREEN)", color: "text-emerald-400" },
                ] as const
              ).map((tier) => {
                const isSelected = preferences.defaultSeverity === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSetDefaultSeverity(tier.id)}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#1f2637] border-blue-500 text-zinc-100 font-semibold"
                        : "bg-[#161a23] hover:bg-[#1e232f] border-[#262c3b] text-zinc-400"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-blue-400" />}
                    <span className={tier.color}>{tier.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. About & Architecture Specifications */}
      <div className="bg-[#12151d] border border-[#1e232e] rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e232e] bg-[#10131a] flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-100">
            About AlertPulse & Technology Specifications
          </h3>
        </div>

        <div className="p-4 space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded bg-[#0f1219] border border-[#1e232e]">
              <span className="text-[10px] uppercase text-zinc-500 block">Version</span>
              <span className="text-zinc-200 font-semibold mt-0.5 block">v1.2.0</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1219] border border-[#1e232e]">
              <span className="text-[10px] uppercase text-zinc-500 block">Frontend</span>
              <span className="text-zinc-200 mt-0.5 block">Next.js 16 + React 19</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1219] border border-[#1e232e]">
              <span className="text-[10px] uppercase text-zinc-500 block">Backend</span>
              <span className="text-zinc-200 mt-0.5 block">Express + Node.js v24</span>
            </div>
            <div className="p-2.5 rounded bg-[#0f1219] border border-[#1e232e]">
              <span className="text-[10px] uppercase text-zinc-500 block">Persistence</span>
              <span className="text-zinc-200 mt-0.5 block">PostgreSQL + Prisma</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0f1219] border border-[#1e232e] text-[11px] font-sans text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200 font-mono">AlertPulse — The Pager That Cried Wolf</strong> is an SRE incident intelligence platform designed to eliminate pager fatigue through deterministic severity classification, SHA-256 telemetry fingerprint deduplication, and asynchronous Gemini 2.5 incident root-cause analysis.
          </div>
        </div>
      </div>
    </div>
  );
}
