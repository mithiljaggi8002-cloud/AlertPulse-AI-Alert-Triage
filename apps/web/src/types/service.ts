export type ServiceCondition = "CRITICAL" | "DEGRADED" | "NO RECENT INCIDENTS";

export interface ServiceSummary {
  service: string;
  totalAlerts: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  activeIncidents: number;
  lastAlertAt: string | null;
  condition: ServiceCondition;
}

export interface ServicesOverviewData {
  totalServices: number;
  criticalServices: number;
  degradedServices: number;
  noRecentIncidentsServices: number;
}

export interface ServicesResponse {
  success: boolean;
  message?: string;
  data: ServiceSummary[];
  summary: ServicesOverviewData;
}

export interface BackendHealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  gemini: {
    status: "AVAILABLE" | "CONFIGURED" | "UNCONFIGURED" | "UNAVAILABLE" | "DEGRADED";
    model: string;
    configured: boolean;
    lastVerifiedAt?: string | null;
  };
}

export interface UserPreferences {
  refreshInterval: 3 | 5 | 10;
  defaultSeverity: "ALL" | "RED" | "YELLOW" | "GREEN";
}
