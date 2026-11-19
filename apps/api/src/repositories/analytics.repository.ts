import { prisma } from "../config/prisma.js";

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
  bucket: string; // ISO string
  count: number;
}

export interface AnalyticsOverview {
  severityDistribution: SeverityCount[];
  statusDistribution: StatusCount[];
  serviceDistribution: ServiceCount[];
  timeline: TimelineBucket[];
  keyMetrics: {
    total: number;
    critical: number;
    duplicates: number;
    activeIncidents: number;
  };
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const [
    severityGroups,
    statusGroups,
    serviceGroups,
    total,
    critical,
    activeIncidents,
    occurrenceAgg,
    rawTimeline,
  ] = await Promise.all([
    // Severity distribution
    prisma.alert.groupBy({
      by: ["severity"],
      _count: { id: true },
    }),

    // Status distribution
    prisma.alert.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Service distribution (top 10)
    prisma.alert.groupBy({
      by: ["service"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),

    // Total alerts
    prisma.alert.count(),

    // Critical (RED) alerts
    prisma.alert.count({ where: { severity: "RED" } }),

    // Active incidents (not RESOLVED)
    prisma.alert.count({ where: { status: { not: "RESOLVED" } } }),

    // Sum of occurrences for duplicate counting
    prisma.alert.aggregate({ _sum: { occurrenceCount: true } }),

    // Timeline: last 48 hours grouped by hour (raw SQL)
    prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
      SELECT
        DATE_TRUNC('hour', "createdAt") AS bucket,
        COUNT(*)::bigint AS count
      FROM "Alert"
      WHERE "createdAt" >= NOW() - INTERVAL '48 hours'
      GROUP BY DATE_TRUNC('hour', "createdAt")
      ORDER BY bucket DESC
      LIMIT 48
    `,
  ]);

  const totalOccurrences = occurrenceAgg._sum.occurrenceCount ?? 0;
  const duplicates = Math.max(0, totalOccurrences - total);

  const severityMap = new Map(severityGroups.map((g) => [g.severity, g._count.id]));
  const fullSeverityDistribution: SeverityCount[] = [
    { severity: "RED", count: severityMap.get("RED") ?? 0 },
    { severity: "YELLOW", count: severityMap.get("YELLOW") ?? 0 },
    { severity: "GREEN", count: severityMap.get("GREEN") ?? 0 },
  ];

  return {
    severityDistribution: fullSeverityDistribution,
    statusDistribution: statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    })),
    serviceDistribution: serviceGroups.map((g) => ({
      service: g.service,
      count: g._count.id,
    })),
    timeline: rawTimeline.map((row) => ({
      bucket: row.bucket.toISOString(),
      count: Number(row.count),
    })),
    keyMetrics: {
      total,
      critical,
      duplicates,
      activeIncidents,
    },
  };
}
