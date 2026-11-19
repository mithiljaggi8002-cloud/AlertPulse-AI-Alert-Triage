"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Zap,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Server,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Fingerprint,
  Check,
  Radio,
  PlusCircle,
  Repeat,
} from "lucide-react";
import { ingestAlert } from "@/lib/api";
import type { IngestAlertPayload, IngestAlertResponse } from "@/types/alert";

interface AlertSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertIngested: (result: IngestAlertResponse) => void;
}

interface ScenarioOption {
  id: "RED" | "YELLOW" | "GREEN" | "DUPLICATE";
  title: string;
  badge: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  description: string;
  payload: IngestAlertPayload;
  explanation: string;
}

// Realistic baseline scenarios
const BASELINE_SCENARIOS = {
  RED: [
    {
      source: "datadog",
      service: "payment-service",
      host: "prod-pay-api-01",
      message:
        "Critical: payment-service database connection pool exhausted; transactions failing with connection refused",
      value: 98,
    },
    {
      source: "datadog",
      service: "checkout-api",
      host: "k8s-pod-checkout-04",
      message:
        "Critical outage: checkout service crashed with fatal OOM panic; downstream orders failing",
      value: 99,
    },
  ],
  YELLOW: [
    {
      source: "cloudwatch",
      service: "order-processor",
      host: "ip-10-0-4-122.ec2.internal",
      message:
        "Warning: CPU utilization spike sustained above threshold (86%); request latency degraded",
      value: 86,
    },
    {
      source: "cloudwatch",
      service: "search-indexer",
      host: "es-cluster-node-03",
      message:
        "Warning: high indexing queue lag detected (74%); search queries running slow and retrying",
      value: 74,
    },
  ],
  GREEN: [
    {
      source: "kubernetes",
      service: "auth-gateway",
      host: "k8s-worker-node-09",
      message:
        "Service recovered: health checks returning OK 200; error budget replenished and latency normal",
      value: 15,
    },
    {
      source: "kubernetes",
      service: "cache-service",
      host: "redis-cluster-01",
      message:
        "Service recovered: Redis node cluster healthy, memory usage normal and replica sync cleared",
      value: 20,
    },
    {
      source: "kubernetes",
      service: "billing-service",
      host: "billing-worker-02",
      message:
        "Service recovered: payment webhook listener restored; transactions cleared and healthy",
      value: 12,
    },
  ],
};

export function AlertSimulatorModal({
  isOpen,
  onClose,
  onAlertIngested,
}: AlertSimulatorModalProps) {
  const [activeScenario, setActiveScenario] = useState<
    "RED" | "YELLOW" | "GREEN" | "DUPLICATE"
  >("RED");

  // Allow generating fresh alerts or repeating identical payload
  const [forceNewAlert, setForceNewAlert] = useState<boolean>(true);
  const [scenarioVariant, setScenarioVariant] = useState<number>(0);

  const [lastSubmittedPayload, setLastSubmittedPayload] =
    useState<IngestAlertPayload>(BASELINE_SCENARIOS.RED[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "duplicate" | "error";
    title: string;
    message: string;
    response?: IngestAlertResponse;
  } | null>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Determine payload for the active scenario
  const getPayload = (): IngestAlertPayload => {
    if (activeScenario === "DUPLICATE") {
      return lastSubmittedPayload;
    }

    const pool = BASELINE_SCENARIOS[activeScenario];
    const base = pool[scenarioVariant % pool.length];

    if (forceNewAlert) {
      // Add a clean timestamp suffix so each injection creates a new row if requested
      const now = new Date();
      const timeTag = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      return {
        ...base,
        host: `${base.host}-${Math.floor(Math.random() * 90 + 10)}`,
        message: `${base.message} (event at ${timeTag})`,
      };
    }

    return base;
  };

  const currentPayload = getPayload();

  const scenarios: ScenarioOption[] = [
    {
      id: "RED",
      title: "RED: Critical Outage",
      badge: "CRITICAL",
      badgeClass: "bg-red-950/60 text-red-400 border-red-800/80",
      dotClass: "bg-red-500",
      borderClass:
        activeScenario === "RED"
          ? "border-red-500/80 bg-red-950/20"
          : "border-[#1e232e] bg-[#12151d] hover:border-red-900/50",
      description:
        "Simulates a major service breakdown with connection refused / fatal errors.",
      payload: currentPayload,
      explanation:
        "Rule triggers RED severity on keyword 'critical' & metric >= 90. Triggers Gemini root-cause analysis.",
    },
    {
      id: "YELLOW",
      title: "YELLOW: Performance Warning",
      badge: "WARNING",
      badgeClass: "bg-amber-950/60 text-amber-400 border-amber-800/80",
      dotClass: "bg-amber-500",
      borderClass:
        activeScenario === "YELLOW"
          ? "border-amber-500/80 bg-amber-950/20"
          : "border-[#1e232e] bg-[#12151d] hover:border-amber-900/50",
      description:
        "Simulates elevated resource pressure causing degraded request latency.",
      payload: currentPayload,
      explanation:
        "Rule triggers YELLOW severity on keyword 'warning' & metric >= 70.",
    },
    {
      id: "GREEN",
      title: "GREEN: Service Recovery",
      badge: "RECOVERY",
      badgeClass: "bg-emerald-950/60 text-emerald-400 border-emerald-800/80",
      dotClass: "bg-emerald-500",
      borderClass:
        activeScenario === "GREEN"
          ? "border-emerald-500/80 bg-emerald-950/20"
          : "border-[#1e232e] bg-[#12151d] hover:border-emerald-900/50",
      description:
        "Simulates health recovery returning OK 200, normal latency, and replenished budget.",
      payload: currentPayload,
      explanation:
        "Rule triggers GREEN severity on keywords 'recovered', 'ok', and 'normal'.",
    },
    {
      id: "DUPLICATE",
      title: "DUPLICATE: Resend Identical",
      badge: "DEDUP TEST",
      badgeClass: "bg-blue-950/60 text-blue-400 border-blue-800/80",
      dotClass: "bg-blue-500",
      borderClass:
        activeScenario === "DUPLICATE"
          ? "border-blue-500/80 bg-blue-950/20"
          : "border-[#1e232e] bg-[#12151d] hover:border-blue-900/50",
      description:
        "Resubmits the identical payload to test fingerprint collision & occurrenceCount.",
      payload: lastSubmittedPayload,
      explanation:
        "Backend detects fingerprint match, increments occurrenceCount, and reuses AI analysis.",
    },
  ];

  const currentOption = scenarios.find((s) => s.id === activeScenario)!;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    const payloadToSubmit =
      activeScenario === "DUPLICATE" ? lastSubmittedPayload : currentPayload;

    try {
      const response = await ingestAlert(payloadToSubmit);
      setLastSubmittedPayload(payloadToSubmit);
      setScenarioVariant((prev) => prev + 1);

      if (response.deduplicated) {
        setFeedback({
          type: "duplicate",
          title: "Duplicate Alert Handled (HTTP 200)",
          message: `Fingerprint matched! Counter incremented to ${response.data.occurrenceCount}x. Database row count preserved.`,
          response,
        });
      } else {
        setFeedback({
          type: "success",
          title: `Alert Received & Persisted (HTTP 201)`,
          message: `Alert persisted in PostgreSQL as ${response.data.severity}. Background Gemini analysis running.`,
          response,
        });
      }

      // Refresh dashboard tables, counts, and analytics immediately
      onAlertIngested(response);
    } catch (err) {
      setFeedback({
        type: "error",
        title: "Submission Failed",
        message:
          err instanceof Error
            ? err.message
            : "Network error communicating with /api/alerts. Please check backend connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-3xl rounded-lg bg-[#0f1219] border border-[#232938] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-[#1e232e] bg-[#12151d] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-blue-950/60 border border-blue-800/80 flex items-center justify-center text-blue-400">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100 font-mono">
                    Alert Telemetry Simulator
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Live Pipeline
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Inject synthetic telemetry through POST /api/alerts (real DB persistence & async Gemini triage)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1f2b] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Feedback / Status Banner */}
            {feedback && (
              <div
                className={`p-3.5 rounded border text-xs font-mono transition-all animate-in fade-in duration-150 ${
                  feedback.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                    : feedback.type === "duplicate"
                    ? "bg-blue-950/40 border-blue-800/80 text-blue-200"
                    : "bg-red-950/40 border-red-800/80 text-red-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : feedback.type === "duplicate" ? (
                    <Copy className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold">{feedback.title}</div>
                    <div className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                      {feedback.message}
                    </div>

                    {feedback.response && (
                      <div className="pt-2 mt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <span className="text-zinc-400 block">Alert ID:</span>
                          <span className="font-mono text-zinc-200">
                            {feedback.response.data.id.slice(0, 10)}...
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block">Severity:</span>
                          <span className="font-semibold text-zinc-200">
                            {feedback.response.data.severity}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block">Occurrences:</span>
                          <span className="font-mono font-bold text-amber-300">
                            {feedback.response.data.occurrenceCount}x
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block">Deduplicated:</span>
                          <span className="font-mono text-zinc-200">
                            {feedback.response.deduplicated ? "YES" : "NO"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Scenario Selection Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-blue-400" />
                  Select Ingestion Scenario
                </label>

                {activeScenario !== "DUPLICATE" && (
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-mono text-zinc-400 hover:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={forceNewAlert}
                      onChange={(e) => setForceNewAlert(e.target.checked)}
                      className="rounded bg-[#10131a] border-[#2a3447] text-blue-500 focus:ring-0"
                    />
                    <span>Generate as New Unique Incident</span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {scenarios.map((scenario) => {
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => {
                        setActiveScenario(scenario.id);
                        setFeedback(null);
                      }}
                      className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${scenario.borderClass}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-100 flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${scenario.dotClass}`}
                          />
                          {scenario.title.split(":")[0]}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium ${scenario.badgeClass}`}
                        >
                          {scenario.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                        {scenario.description}
                      </p>

                      <div className="text-[10px] text-zinc-500 font-mono truncate">
                        Service:{" "}
                        <span className="text-zinc-300 font-semibold">
                          {scenario.payload.service}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Payload Inspection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-zinc-500" />
                  Payload Preview (POST /api/alerts)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Target: http://localhost:5000/api/alerts
                </span>
              </div>

              <div className="p-3 rounded bg-[#0b0d13] border border-[#1e232e] font-mono text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">
                      Source
                    </span>
                    <span className="text-zinc-200">
                      {currentOption.payload.source}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">
                      Service
                    </span>
                    <span className="text-zinc-200 font-semibold">
                      {currentOption.payload.service}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">
                      Host
                    </span>
                    <span className="text-zinc-300">
                      {currentOption.payload.host || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">
                      Metric Value
                    </span>
                    <span className="text-zinc-200 font-semibold">
                      {currentOption.payload.value ?? "N/A"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1a1f2c]">
                  <span className="text-zinc-500 block text-[10px] uppercase mb-0.5">
                    Telemetry Message
                  </span>
                  <p className="text-zinc-200 text-[11px] break-words bg-[#10131a] p-2 rounded border border-[#1a202c]">
                    {currentOption.payload.message}
                  </p>
                </div>

                <div className="pt-1 text-[11px] text-zinc-400 font-sans flex items-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{currentOption.explanation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3.5 border-t border-[#1e232e] bg-[#12151d] flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              Calls live backend & triggers real Gemini analysis
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-[#161a23] hover:bg-[#1d222e] text-zinc-300 text-xs font-mono font-medium border border-[#262c3b] transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeScenario === "RED"
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20"
                    : activeScenario === "YELLOW"
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                    : activeScenario === "GREEN"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting alert...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>
                      {activeScenario === "DUPLICATE"
                        ? "Inject Duplicate Payload"
                        : `Inject ${activeScenario} Alert`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
