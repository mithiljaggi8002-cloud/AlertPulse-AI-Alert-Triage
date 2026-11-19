import { createHash } from "node:crypto";
import { AlertSeverity } from "../../generated/prisma/enums.js";
import type { Alert } from "../../generated/prisma/client.js";
import {
  alertAiAnalysisSchema,
  type CreateAlertInput,
  type AlertAiAnalysis,
  type GetAlertsQueryInput,
} from "../validators/alert.schema.js";
import {
  findAlertByFingerprint,
  createAlert,
  incrementAlertOccurrence,
  updateAlertAiAnalysis,
  findAlerts,
  deleteAlertById,
} from "../repositories/alert.repository.js";
import { analyzeAlertWithGemini } from "./gemini.service.js";

export interface SeverityClassification {
  severity: AlertSeverity;
  reason: string;
}

export interface IngestAlertResult {
  alert: Alert;
  isDuplicate: boolean;
  aiAnalysis?: AlertAiAnalysis | null;
}

/**
 * Generates a deterministic SHA-256 fingerprint for duplicate detection.
 */
export function generateAlertFingerprint(params: {
  source: string;
  service: string;
  host?: string | null;
  message: string;
}): string {
  const normalizedSource = params.source.trim().toLowerCase();
  const normalizedService = params.service.trim().toLowerCase();
  const normalizedHost = (params.host ?? "").trim().toLowerCase();
  const normalizedMessage = params.message.trim().toLowerCase();

  const rawKey = `${normalizedSource}|${normalizedService}|${normalizedHost}|${normalizedMessage}`;
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Classifies alerts into RED, YELLOW, and GREEN using deterministic rules.
 * Gemini is intentionally not used for critical severity decisions.
 */
export function classifyAlertSeverity(input: {
  message: string;
  service: string;
  source: string;
  value?: number | null;
}): SeverityClassification {
  const lowerMessage = input.message.toLowerCase();
  const val = input.value;

  // 1. Critical indicators -> RED
  const criticalKeywords = [
    "fatal",
    "critical",
    "outage",
    "down",
    "panic",
    "crash",
    "deadlock",
    "emergency",
    "unreachable",
    "connection refused",
    "oom",
    "out of memory",
    "segfault",
    "segmentation fault",
    "data loss",
    "breach",
  ];

  for (const kw of criticalKeywords) {
    if (lowerMessage.includes(kw)) {
      return {
        severity: AlertSeverity.RED,
        reason: `Rule-based classification: detected critical keyword '${kw}' in alert message`,
      };
    }
  }

  // Value-based critical threshold (e.g. CPU/Memory/Disk/Error rate >= 90%)
  if (typeof val === "number" && val >= 90) {
    return {
      severity: AlertSeverity.RED,
      reason: `Rule-based classification: numeric value (${val}) reached or exceeded critical threshold (>= 90)`,
    };
  }

  // 2. Recovery / Healthy indicators -> GREEN
  const recoveryKeywords = [
    "resolved",
    "recovered",
    "healthy",
    "ok",
    "normal",
    "cleared",
    "success",
  ];

  for (const kw of recoveryKeywords) {
    if (lowerMessage.includes(kw)) {
      return {
        severity: AlertSeverity.GREEN,
        reason: `Rule-based classification: detected recovery/healthy keyword '${kw}' in alert message`,
      };
    }
  }

  // 3. Warning indicators -> YELLOW
  const warningKeywords = [
    "warn",
    "warning",
    "high",
    "elevated",
    "slow",
    "spike",
    "timeout",
    "timed out",
    "retry",
    "retries",
    "threshold",
    "degraded",
    "lag",
    "latency",
    "dropped",
  ];

  for (const kw of warningKeywords) {
    if (lowerMessage.includes(kw)) {
      return {
        severity: AlertSeverity.YELLOW,
        reason: `Rule-based classification: detected warning keyword '${kw}' in alert message`,
      };
    }
  }

  // Value-based warning threshold (e.g. >= 70%)
  if (typeof val === "number" && val >= 70) {
    return {
      severity: AlertSeverity.YELLOW,
      reason: `Rule-based classification: numeric value (${val}) reached warning threshold (>= 70)`,
    };
  }

  // If numeric value is low (< 50) and no warning keywords, mark as GREEN
  if (typeof val === "number" && val < 50) {
    return {
      severity: AlertSeverity.GREEN,
      reason: `Rule-based classification: numeric value (${val}) is within normal operating range (< 50)`,
    };
  }

  // 4. Default fallback -> YELLOW
  return {
    severity: AlertSeverity.YELLOW,
    reason: "Rule-based classification: default severity (YELLOW) applied; no explicit critical or recovery pattern matched",
  };
}

/**
 * Builds an initial concise summary for the alert.
 */
function buildInitialSummary(params: {
  severity: AlertSeverity;
  service: string;
  source: string;
  host?: string | null;
  message: string;
}): string {
  const hostSegment = params.host ? ` on ${params.host}` : "";
  return `[${params.severity}] [${params.source}] ${params.service}${hostSegment}: ${params.message}`;
}

/**
 * Helper to safely extract existing structured AI analysis from aiReason if present.
 */
function extractExistingAiAnalysis(aiReason: string | null): AlertAiAnalysis | null {
  if (!aiReason) return null;
  try {
    const parsed = JSON.parse(aiReason);
    const validated = alertAiAnalysisSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

// In-memory set to prevent duplicate concurrent background AI runs for the same alert ID
const pendingAiAnalysisAlertIds = new Set<string>();

/**
 * Executes Gemini AI analysis asynchronously in the background.
 * Updates the existing alert record without creating duplicates or blocking HTTP responses.
 */
export function triggerAsyncGeminiAnalysis(params: {
  id: string;
  source: string;
  service: string;
  host?: string | null;
  message: string;
  severity: AlertSeverity;
  occurrenceCount: number;
  value?: number | null;
  fallbackReason: string;
}): void {
  if (pendingAiAnalysisAlertIds.has(params.id)) {
    return;
  }
  pendingAiAnalysisAlertIds.add(params.id);

  (async () => {
    try {
      const aiAnalysis = await analyzeAlertWithGemini({
        source: params.source,
        service: params.service,
        host: params.host,
        message: params.message,
        severity: params.severity,
        occurrenceCount: params.occurrenceCount,
        value: params.value,
      });

      // Update existing record with structured AI analysis
      await updateAlertAiAnalysis(params.id, {
        aiSummary: aiAnalysis.summary,
        aiReason: JSON.stringify({
          aiStatus: "COMPLETED",
          ...aiAnalysis,
        }),
      });
    } catch (aiError) {
      console.warn(
        `Async Gemini analysis failed for alert ${params.id} (preserving fallback rule):`,
        aiError instanceof Error ? aiError.message : aiError
      );
      try {
        await updateAlertAiAnalysis(params.id, {
          aiReason: JSON.stringify({
            aiStatus: "FAILED",
            fallbackReason: params.fallbackReason,
            error: aiError instanceof Error ? aiError.message : String(aiError),
          }),
        });
      } catch (dbErr) {
        console.error(`Failed to update fallback AI status for alert ${params.id}:`, dbErr);
      }
    } finally {
      pendingAiAnalysisAlertIds.delete(params.id);
    }
  })().catch((err) => {
    console.error("Unhandled error in async Gemini analysis:", err);
    pendingAiAnalysisAlertIds.delete(params.id);
  });
}

/**
 * Ingests an incoming alert, handles deduplication, and triggers Gemini AI analysis asynchronously.
 */
export async function ingestAlertService(input: CreateAlertInput): Promise<IngestAlertResult> {
  const normalizedHost = input.host?.trim() || null;
  const fingerprint = generateAlertFingerprint({
    source: input.source,
    service: input.service,
    host: normalizedHost,
    message: input.message,
  });

  const existingAlert = await findAlertByFingerprint(fingerprint);

  if (existingAlert) {
    const updatedAlert = await incrementAlertOccurrence(existingAlert.id);

    // Reuse existing AI analysis for duplicates to avoid unnecessary repeated Gemini calls
    const existingAnalysis = extractExistingAiAnalysis(existingAlert.aiReason);
    if (existingAnalysis) {
      return {
        alert: updatedAlert,
        isDuplicate: true,
        aiAnalysis: existingAnalysis,
      };
    }

    // If initial alert previously failed or was pending, attempt background analysis
    triggerAsyncGeminiAnalysis({
      id: updatedAlert.id,
      source: updatedAlert.source,
      service: updatedAlert.service,
      host: updatedAlert.host,
      message: updatedAlert.message,
      severity: updatedAlert.severity,
      occurrenceCount: updatedAlert.occurrenceCount,
      value: input.value,
      fallbackReason: updatedAlert.aiReason || "Duplicate alert",
    });

    return {
      alert: updatedAlert,
      isDuplicate: true,
      aiAnalysis: null,
    };
  }

  const { severity, reason } = classifyAlertSeverity({
    message: input.message,
    service: input.service,
    source: input.source,
    value: input.value,
  });

  const initialSummary = buildInitialSummary({
    severity,
    service: input.service,
    source: input.source,
    host: normalizedHost,
    message: input.message,
  });

  const initialAiReason = JSON.stringify({
    aiStatus: "PENDING",
    fallbackReason: reason,
  });

  let savedAlert: Alert;
  try {
    savedAlert = await createAlert({
      source: input.source.trim(),
      service: input.service.trim(),
      host: normalizedHost,
      message: input.message.trim(),
      fingerprint,
      severity,
      status: "OPEN",
      occurrenceCount: 1,
      aiSummary: initialSummary,
      aiReason: initialAiReason,
    });
  } catch (error: any) {
    // If concurrent requests created the alert at the same time
    if (error?.code === "P2002") {
      const concurrentAlert = await findAlertByFingerprint(fingerprint);
      if (concurrentAlert) {
        const updatedAlert = await incrementAlertOccurrence(concurrentAlert.id);
        const existingAnalysis = extractExistingAiAnalysis(concurrentAlert.aiReason);
        return {
          alert: updatedAlert,
          isDuplicate: true,
          aiAnalysis: existingAnalysis,
        };
      }
    }
    throw error;
  }

  // Trigger Gemini AI explanation asynchronously in background after successful persistence
  triggerAsyncGeminiAnalysis({
    id: savedAlert.id,
    source: savedAlert.source,
    service: savedAlert.service,
    host: savedAlert.host,
    message: savedAlert.message,
    severity: savedAlert.severity,
    occurrenceCount: savedAlert.occurrenceCount,
    value: input.value,
    fallbackReason: reason,
  });

  // Return immediately after PostgreSQL persistence!
  return {
    alert: savedAlert,
    isDuplicate: false,
    aiAnalysis: null,
  };
}

export interface GetAlertsServiceResult {
  alerts: Alert[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Retrieves paginated alerts with optional severity and status filters.
 */
export async function getAlertsService(
  params: GetAlertsQueryInput
): Promise<GetAlertsServiceResult> {
  const { alerts, total } = await findAlerts({
    severity: params.severity as AlertSeverity | undefined,
    status: params.status,
    service: params.service,
    page: params.page,
    limit: params.limit,
  });

  const totalPages = Math.ceil(total / params.limit);

  return {
    alerts,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
    },
  };
}

export async function deleteAlertService(id: string): Promise<boolean> {
  return deleteAlertById(id);
}
