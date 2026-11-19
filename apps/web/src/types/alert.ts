export type AlertSeverity = "RED" | "YELLOW" | "GREEN";

export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface Alert {
  id: string;
  source: string;
  service: string;
  host: string | null;
  message: string;
  fingerprint: string;
  severity: AlertSeverity;
  status: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  aiSummary: string | null;
  aiReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AlertsResponse {
  success: boolean;
  data: Alert[];
  pagination: PaginationMeta;
}

export type AiAnalysisStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface ParsedAiAnalysis {
  status: AiAnalysisStatus;
  summary?: string;
  possibleCause?: string;
  potentialImpact?: string;
  recommendedActions?: string[];
  rawText?: string;
}

export interface AlertCounts {
  total: number;
  red: number;
  yellow: number;
  green: number;
}

// Analytics types
export interface SeverityCount {
  severity: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface ServiceCount {
  service: string;
  count: number;
}

export interface TimelineBucket {
  bucket: string;
  count: number;
}

export interface AnalyticsKeyMetrics {
  total: number;
  critical: number;
  duplicates: number;
  activeIncidents: number;
}

export interface AnalyticsOverviewData {
  severityDistribution: SeverityCount[];
  statusDistribution: StatusCount[];
  serviceDistribution: ServiceCount[];
  timeline: TimelineBucket[];
  keyMetrics: AnalyticsKeyMetrics;
}

export interface AnalyticsOverviewResponse {
  success: boolean;
  data: AnalyticsOverviewData;
}

export interface IngestAlertPayload {
  source: string;
  service: string;
  host?: string | null;
  message: string;
  value?: number | null;
}

export interface IngestAlertResponse {
  success: boolean;
  message: string;
  data: Alert;
  aiAnalysis?: ParsedAiAnalysis | null;
  deduplicated: boolean;
}
