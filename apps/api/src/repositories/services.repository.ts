import { prisma } from "../config/prisma.js";

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

export interface ServicesOverviewResult {
  services: ServiceSummary[];
  summary: {
    totalServices: number;
    criticalServices: number;
    degradedServices: number;
    noRecentIncidentsServices: number;
  };
}

/**
 * Aggregates alert telemetry across all services in PostgreSQL.
 * Applies strict condition rules:
 * - CRITICAL: At least one active (OPEN or ACKNOWLEDGED) RED alert.
 * - DEGRADED: No active RED alert, but at least one active (OPEN or ACKNOWLEDGED) YELLOW alert.
 * - NO RECENT INCIDENTS: No active RED or YELLOW alerts.
 */
export async function getServicesOverview(): Promise<ServicesOverviewResult> {
  const alerts = await prisma.alert.findMany({
    select: {
      service: true,
      severity: true,
      status: true,
      lastSeen: true,
    },
    orderBy: {
      lastSeen: "desc",
    },
  });

  const map = new Map<
    string,
    {
      service: string;
      totalAlerts: number;
      redCount: number;
      yellowCount: number;
      greenCount: number;
      activeIncidents: number;
      activeRedCount: number;
      activeYellowCount: number;
      lastAlertAt: Date | null;
    }
  >();

  for (const a of alerts) {
    let entry = map.get(a.service);
    if (!entry) {
      entry = {
        service: a.service,
        totalAlerts: 0,
        redCount: 0,
        yellowCount: 0,
        greenCount: 0,
        activeIncidents: 0,
        activeRedCount: 0,
        activeYellowCount: 0,
        lastAlertAt: a.lastSeen,
      };
      map.set(a.service, entry);
    }

    entry.totalAlerts++;
    if (a.severity === "RED") entry.redCount++;
    else if (a.severity === "YELLOW") entry.yellowCount++;
    else if (a.severity === "GREEN") entry.greenCount++;

    const isActive = a.status === "OPEN" || a.status === "ACKNOWLEDGED";
    if (isActive) {
      entry.activeIncidents++;
      if (a.severity === "RED") entry.activeRedCount++;
      else if (a.severity === "YELLOW") entry.activeYellowCount++;
    }

    if (!entry.lastAlertAt || a.lastSeen > entry.lastAlertAt) {
      entry.lastAlertAt = a.lastSeen;
    }
  }

  let criticalServices = 0;
  let degradedServices = 0;
  let noRecentIncidentsServices = 0;

  const services: ServiceSummary[] = Array.from(map.values()).map((s) => {
    let condition: ServiceCondition = "NO RECENT INCIDENTS";
    if (s.activeRedCount > 0) {
      condition = "CRITICAL";
      criticalServices++;
    } else if (s.activeYellowCount > 0) {
      condition = "DEGRADED";
      degradedServices++;
    } else {
      noRecentIncidentsServices++;
    }

    return {
      service: s.service,
      totalAlerts: s.totalAlerts,
      redCount: s.redCount,
      yellowCount: s.yellowCount,
      greenCount: s.greenCount,
      activeIncidents: s.activeIncidents,
      lastAlertAt: s.lastAlertAt ? s.lastAlertAt.toISOString() : null,
      condition,
    };
  });

  // Sort order: CRITICAL first, then DEGRADED, then NO RECENT INCIDENTS, then by active incidents desc
  const conditionOrder: Record<ServiceCondition, number> = {
    CRITICAL: 0,
    DEGRADED: 1,
    "NO RECENT INCIDENTS": 2,
  };

  services.sort((a, b) => {
    const orderDiff = conditionOrder[a.condition] - conditionOrder[b.condition];
    if (orderDiff !== 0) return orderDiff;
    return b.activeIncidents - a.activeIncidents || b.totalAlerts - a.totalAlerts;
  });

  return {
    services,
    summary: {
      totalServices: services.length,
      criticalServices,
      degradedServices,
      noRecentIncidentsServices,
    },
  };
}
