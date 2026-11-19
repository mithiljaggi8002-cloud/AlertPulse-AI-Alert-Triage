"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Fingerprint,
  HelpCircle,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { Alert } from "@/types/alert";
import {
  parseAiAnalysis,
  getSeverityStyles,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/utils";

interface AlertDetailDrawerProps {
  alert: Alert | null;
  onClose: () => void;
  onResolve: (alertId: string) => Promise<void>;
}

function formatDuration(startAt: string, endAt?: string): string {
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return "Unknown";
  }

  const totalMinutes = Math.floor((end - start) / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

export function AlertDetailDrawer({ alert, onClose, onResolve }: AlertDetailDrawerProps) {
  const [copiedFp, setCopiedFp] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsResolving(false);
    setResolveError(null);
    setIsClosing(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, [alert?.id]);

  useEffect(() => {
    if (!alert) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [alert?.id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  if (!alert) return null;

  const severityStyles = getSeverityStyles(alert.severity);
  const aiAnalysis = parseAiAnalysis(alert.aiReason);
  const status = alert.status.toUpperCase();
  const occurrenceCount = Math.max(1, alert.occurrenceCount || 1);
  const hasGeminiAnalysis =
    aiAnalysis?.status === "COMPLETED" && Boolean(aiAnalysis.summary);
  const summaryRepeatsMessage = Boolean(
    aiAnalysis?.summary &&
      normalizeText(aiAnalysis.summary) === normalizeText(alert.message),
  );
  const ruleRationale =
    aiAnalysis?.rawText?.startsWith("Rule-based classification:")
      ? aiAnalysis.rawText
      : null;
  const possibleCause = aiAnalysis?.possibleCause;
  const causeIsHypothesis = Boolean(
    possibleCause &&
      ["may", "might", "could", "possibly", "potentially", "unclear", "unknown", "hypothesis", "cannot confirm"].some(
        (term) => possibleCause.toLowerCase().includes(term),
      ),
  );
  const statusStyles =
    status === "RESOLVED"
      ? "bg-emerald-500/10 text-emerald-300"
      : status === "RESOLVING"
        ? "bg-amber-500/10 text-amber-300"
        : "bg-white/[0.06] text-zinc-300";

  const handleClose = () => {
    if (isClosing || isResolving) return;
    setIsClosing(true);
    closeTimer.current = setTimeout(onClose, 180);
  };

  const handleCopy = async (value: string, field: "id" | "fingerprint") => {
    try {
      await navigator.clipboard.writeText(value);
      if (field === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 1600);
      } else {
        setCopiedFp(true);
        setTimeout(() => setCopiedFp(false), 1600);
      }
    } catch {
      setResolveError("Clipboard access is unavailable in this browser.");
    }
  };

  const handleResolve = async () => {
    setIsResolving(true);
    setResolveError(null);
    try {
      await onResolve(alert.id);
    } catch (error) {
      setResolveError(
        error instanceof Error ? error.message : "Unable to resolve this alert.",
      );
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden p-3 sm:p-6">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-title"
        className={`relative flex h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#0d0e13] shadow-[0_32px_100px_rgba(0,0,0,0.65)] transition-[opacity,transform] duration-200 ease-out ${isClosing ? "scale-[0.98] opacity-0" : "scale-100 opacity-100"}`}
      >
        <header className="shrink-0 border-b border-white/[0.08] bg-white/[0.015] px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold tracking-wide ${severityStyles.pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${severityStyles.dot}`} />
                  {alert.severity}
                </span>
                <span className={`rounded px-2 py-1 text-[11px] font-medium ${statusStyles}`}>
                  {status}
                </span>
                <span className="text-xs text-zinc-500">
                  {occurrenceCount} {occurrenceCount === 1 ? "occurrence" : "occurrences"}
                </span>
              </div>

              <div className="min-w-0">
                <h2 id="incident-title" className="break-words text-[21px] font-semibold leading-7 text-zinc-100">
                  {alert.service}
                </h2>
                {alert.host && (
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-zinc-400">
                    <Server className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span className="break-all">{alert.host}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  Detected {formatRelativeTime(alert.firstSeen)}
                </span>
                <span>{status === "RESOLVED" ? "Open duration" : "Open for"} {formatDuration(alert.firstSeen, status === "RESOLVED" ? alert.updatedAt : undefined)}</span>
                <span className="inline-flex items-center gap-1">
                  ID {alert.id.slice(0, 8)}
                  <button
                    type="button"
                    onClick={() => void handleCopy(alert.id, "id")}
                    aria-label="Copy incident ID"
                    title={copiedId ? "Incident ID copied" : "Copy incident ID"}
                    className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isResolving}
              aria-label="Close incident details"
              title="Close dialog"
              className="shrink-0 rounded p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          <div className="mx-auto max-w-2xl space-y-7">
            <section aria-labelledby="intelligence-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 id="intelligence-heading" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  Incident intelligence
                </h3>
                <span className="text-[11px] text-zinc-500">
                  {hasGeminiAnalysis ? "Gemini analysis" : "Analysis unavailable"}
                </span>
              </div>

              <div className="space-y-4 border-l border-violet-400/30 pl-4">
                <div>
                  <h4 className="text-[12px] font-medium text-violet-300">What is happening</h4>
                  <p className="mt-1.5 text-[14px] leading-6 text-zinc-200">
                    {hasGeminiAnalysis && !summaryRepeatsMessage
                      ? aiAnalysis.summary
                      : summaryRepeatsMessage
                        ? "Gemini returned a summary matching the alert signal; no additional summary is available."
                        : "Gemini analysis is not available for this alert. Review the source signal below."}
                  </p>
                </div>

                {aiAnalysis?.potentialImpact && (
                  <div>
                    <h4 className="text-[12px] font-medium text-zinc-300">Impact</h4>
                    <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">{aiAnalysis.potentialImpact}</p>
                  </div>
                )}

                <div>
                  <h4 className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-300">
                    <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
                    {possibleCause ? (causeIsHypothesis ? "Cause hypothesis" : "Probable cause") : "Cause assessment"}
                  </h4>
                  <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">
                    {possibleCause || "No AI cause assessment is available. Treat any cause as unconfirmed."}
                  </p>
                </div>

                {aiAnalysis?.recommendedActions && aiAnalysis.recommendedActions.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-medium text-zinc-300">Recommended next steps</h4>
                    <ol className="mt-2 space-y-2">
                      {aiAnalysis.recommendedActions.map((action, index) => (
                        <li key={`${index}-${action}`} className="flex items-start gap-2.5 text-[13px] leading-5 text-zinc-400">
                          <span className="mt-0.5 text-[11px] font-medium tabular-nums text-violet-300">{index + 1}.</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="timeline-heading">
              <h3 id="timeline-heading" className="mb-3 text-[13px] font-semibold text-zinc-100">Timeline</h3>
              <ol className="ml-1 space-y-0 border-l border-white/[0.1]">
                <li className="relative pb-4 pl-4">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0b0c10] bg-zinc-500" />
                  <p className="text-[13px] text-zinc-200">First detected</p>
                  <p className="mt-0.5 text-[12px] text-zinc-500">{formatDateTime(alert.firstSeen)}</p>
                </li>
                {occurrenceCount > 1 && (
                  <li className="relative pb-4 pl-4">
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0b0c10] bg-amber-400" />
                    <p className="text-[13px] text-zinc-200">{occurrenceCount} occurrences grouped</p>
                    <p className="mt-0.5 text-[12px] text-zinc-500">Latest {formatDateTime(alert.lastSeen)}</p>
                  </li>
                )}
                {status === "RESOLVED" && (
                  <li className="relative pl-4">
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0b0c10] bg-emerald-400" />
                    <p className="text-[13px] text-zinc-200">Resolved</p>
                    <p className="mt-0.5 text-[12px] text-zinc-500">{formatDateTime(alert.updatedAt)}</p>
                  </li>
                )}
              </ol>
              <p className="mt-2 text-[11px] text-zinc-600">Severity change history is not stored for this incident.</p>
            </section>

            <section aria-labelledby="signal-heading">
              <h3 id="signal-heading" className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
                <Radio className="h-3.5 w-3.5 text-zinc-500" />
                Alert signal
              </h3>
              <p className="break-words text-[13px] leading-5 text-zinc-400">{alert.message}</p>
            </section>

            <section aria-labelledby="telemetry-heading">
              <h3 id="telemetry-heading" className="mb-2 text-[13px] font-semibold text-zinc-100">Telemetry</h3>
              <dl className="grid grid-cols-2 gap-x-6">
                <div className="border-t border-white/[0.08] py-3">
                  <dt className="text-[11px] text-zinc-500">Source</dt>
                  <dd className="mt-1 break-words text-[12px] text-zinc-300">{alert.source}</dd>
                </div>
                <div className="border-t border-white/[0.08] py-3">
                  <dt className="text-[11px] text-zinc-500">Occurrences</dt>
                  <dd className="mt-1 text-[12px] tabular-nums text-zinc-300">{occurrenceCount}</dd>
                </div>
                <div className="border-t border-white/[0.08] py-3">
                  <dt className="text-[11px] text-zinc-500">First seen</dt>
                  <dd className="mt-1 text-[12px] text-zinc-300">{formatDateTime(alert.firstSeen)}</dd>
                </div>
                <div className="border-t border-white/[0.08] py-3">
                  <dt className="text-[11px] text-zinc-500">Last seen</dt>
                  <dd className="mt-1 text-[12px] text-zinc-300">{formatDateTime(alert.lastSeen)}</dd>
                </div>
              </dl>
            </section>

            {occurrenceCount > 1 && (
              <details className="group border-t border-white/[0.08] pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-zinc-300 [&::-webkit-details-marker]:hidden">
                  <span>Grouped alert activity</span>
                  <span className="flex items-center gap-2 text-[12px] text-zinc-500">
                    {occurrenceCount} events
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-3 space-y-2 text-[12px] leading-5 text-zinc-400">
                  <p>First occurrence · {formatDateTime(alert.firstSeen)}</p>
                  <p>Most recent occurrence · {formatDateTime(alert.lastSeen)}</p>
                  <p className="text-zinc-500">Duplicate alerts are stored as one grouped record; individual intermediate messages and timestamps are not retained.</p>
                </div>
              </details>
            )}

            <details className="group border-t border-white/[0.08] pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-zinc-300 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />Why this severity?</span>
                <span className="flex items-center gap-2 text-[11px] text-zinc-500">
                  Rule-based
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <p className="mt-3 text-[12px] leading-5 text-zinc-400">
                {ruleRationale || "Severity is assigned by deterministic service rules before Gemini analysis. The matched rule was not retained with this incident."}
              </p>
            </details>

            <details className="group border-t border-white/[0.08] pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-zinc-300 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2"><Fingerprint className="h-3.5 w-3.5 text-zinc-500" />Technical details</span>
                <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
              </summary>
              <dl className="mt-3 space-y-4">
                <div>
                  <dt className="mb-1 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                    Alert ID
                    <button type="button" onClick={() => void handleCopy(alert.id, "id")} aria-label="Copy alert ID" className="rounded p-1 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200">
                      {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </dt>
                  <dd className="break-all font-mono text-[12px] text-zinc-300">{alert.id}</dd>
                </div>
                <div>
                  <dt className="mb-1 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                    Deduplication fingerprint
                    <button type="button" onClick={() => void handleCopy(alert.fingerprint, "fingerprint")} aria-label="Copy fingerprint" title={copiedFp ? "Fingerprint copied" : "Copy fingerprint"} className="rounded p-1 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200">
                      {copiedFp ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </dt>
                  <dd className="break-all font-mono text-[11px] leading-5 text-zinc-400">{alert.fingerprint}</dd>
                </div>
              </dl>
            </details>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3.5 sm:px-7">
          <button type="button" onClick={handleResolve} disabled={isResolving} className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
            <CheckCircle2 className="h-4 w-4" />
            {isResolving ? "Resolving..." : "Mark as resolved"}
          </button>
          <button type="button" onClick={handleClose} disabled={isResolving} className="rounded-md border border-white/[0.1] px-4 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
