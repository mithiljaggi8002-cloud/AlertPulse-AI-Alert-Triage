import type { ParsedAiAnalysis, AlertSeverity } from "@/types/alert";

/**
 * Safely parses the aiReason field.
 * In backend, aiReason can be a JSON string of { summary, possibleCause, potentialImpact, recommendedActions }
 * or a plain text string from rule-based triage, or null/undefined.
 */
export function parseAiAnalysis(
  aiReason: string | null | undefined
): ParsedAiAnalysis | null {
  if (!aiReason) return null;
  const trimmed = aiReason.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) {
      const isPending = parsed.aiStatus === "PENDING";
      const isFailed = parsed.aiStatus === "FAILED";
      const status: "PENDING" | "COMPLETED" | "FAILED" = isPending
        ? "PENDING"
        : isFailed
        ? "FAILED"
        : "COMPLETED";

      const summary =
        typeof parsed.summary === "string" ? parsed.summary.trim() : undefined;
      const possibleCause =
        typeof parsed.possibleCause === "string"
          ? parsed.possibleCause.trim()
          : undefined;
      const potentialImpact =
        typeof parsed.potentialImpact === "string"
          ? parsed.potentialImpact.trim()
          : undefined;
      const recommendedActions = Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions
            .filter((item: unknown): item is string => typeof item === "string")
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
        : undefined;

      return {
        status,
        summary,
        possibleCause,
        potentialImpact,
        recommendedActions,
        rawText: parsed.fallbackReason || parsed.rawText || (isFailed ? parsed.error : undefined),
      };
    }
  } catch {
    // String is not JSON, it is plain text (e.g., rule-based severity explanation)
  }

  return {
    status: "FAILED",
    rawText: trimmed,
  };
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 10) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function formatTimeOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

export function getSeverityStyles(severity: AlertSeverity): {
  badge: string;
  dot: string;
  borderLeft: string;
  text: string;
  pill: string;
} {
  switch (severity) {
    case "RED":
      return {
        badge: "bg-red-950/50 text-red-400 border-red-800/60",
        dot: "bg-red-500",
        borderLeft: "border-l-2 border-l-red-500",
        text: "text-red-400",
        pill: "bg-red-500/10 text-red-400 border-red-500/20",
      };
    case "YELLOW":
      return {
        badge: "bg-amber-950/40 text-amber-400 border-amber-800/60",
        dot: "bg-amber-500",
        borderLeft: "border-l-2 border-l-amber-500",
        text: "text-amber-400",
        pill: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    case "GREEN":
      return {
        badge: "bg-emerald-950/40 text-emerald-400 border-emerald-800/60",
        dot: "bg-emerald-500",
        borderLeft: "border-l-2 border-l-emerald-500",
        text: "text-emerald-400",
        pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
  }
}
