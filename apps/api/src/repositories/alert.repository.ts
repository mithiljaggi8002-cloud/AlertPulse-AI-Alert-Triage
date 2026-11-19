import { prisma } from "../config/prisma.js";
import type { AlertSeverity } from "../../generated/prisma/enums.js";
import type { Alert } from "../../generated/prisma/client.js";

export interface CreateAlertData {
  source: string;
  service: string;
  host?: string | null;
  message: string;
  fingerprint: string;
  severity: AlertSeverity;
  status?: string;
  occurrenceCount?: number;
  aiSummary?: string | null;
  aiReason?: string | null;
}

export async function findAlertByFingerprint(fingerprint: string): Promise<Alert | null> {
  return prisma.alert.findUnique({
    where: { fingerprint },
  });
}

export async function findAlertById(id: string): Promise<Alert | null> {
  return prisma.alert.findUnique({
    where: { id },
  });
}

export async function createAlert(data: CreateAlertData): Promise<Alert> {
  return prisma.alert.create({
    data: {
      source: data.source,
      service: data.service,
      host: data.host ?? null,
      message: data.message,
      fingerprint: data.fingerprint,
      severity: data.severity,
      status: data.status ?? "OPEN",
      occurrenceCount: data.occurrenceCount ?? 1,
      aiSummary: data.aiSummary ?? null,
      aiReason: data.aiReason ?? null,
    },
  });
}

export async function incrementAlertOccurrence(id: string): Promise<Alert> {
  return prisma.alert.update({
    where: { id },
    data: {
      occurrenceCount: { increment: 1 },
      lastSeen: new Date(),
    },
  });
}

export async function updateAlertAiAnalysis(
  id: string,
  data: {
    aiSummary?: string;
    aiReason?: string;
  }
): Promise<Alert> {
  return prisma.alert.update({
    where: { id },
    data: {
      ...(data.aiSummary !== undefined && { aiSummary: data.aiSummary }),
      ...(data.aiReason !== undefined && { aiReason: data.aiReason }),
    },
  });
}

export async function deleteAlertById(id: string): Promise<boolean> {
  const result = await prisma.alert.deleteMany({ where: { id } });
  return result.count > 0;
}

export interface FindAlertsParams {
  severity?: AlertSeverity;
  status?: string;
  service?: string;
  page: number;
  limit: number;
}

export interface FindAlertsResult {
  alerts: Alert[];
  total: number;
}

export async function findAlerts(params: FindAlertsParams): Promise<FindAlertsResult> {
  const where: {
    severity?: AlertSeverity;
    status?: string;
    service?: string;
  } = {};

  if (params.severity) {
    where.severity = params.severity;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.service) {
    where.service = params.service;
  }

  const skip = (params.page - 1) * params.limit;
  const take = params.limit;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: {
        lastSeen: "desc",
      },
      skip,
      take,
    }),
    prisma.alert.count({ where }),
  ]);

  return { alerts, total };
}
