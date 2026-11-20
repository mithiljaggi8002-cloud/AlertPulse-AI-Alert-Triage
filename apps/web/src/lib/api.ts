import type {
  AlertsResponse,
  AlertCounts,
  AnalyticsOverviewResponse,
  IngestAlertPayload,
  IngestAlertResponse,
} from "@/types/alert";
import type { ServicesResponse, BackendHealthResponse } from "@/types/service";

const PROD_API_URL = "https://alert-pulse-api.vercel.app";
const DEV_API_URL = "http://localhost:5000";

export function getApiBaseUrl(): string {
  if (
    process.env.NEXT_PUBLIC_API_URL &&
    process.env.NEXT_PUBLIC_API_URL.trim().length > 0
  ) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return PROD_API_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return PROD_API_URL;
    }
  }
  return DEV_API_URL;
}

export async function fetchAlerts(params: {
  severity?: string;
  status?: string;
  service?: string;
  page?: number;
  limit?: number;
}): Promise<AlertsResponse> {
  const query = new URLSearchParams();
  if (params.severity && params.severity !== "ALL") {
    query.set("severity", params.severity);
  }
  if (params.status && params.status !== "ALL") {
    query.set("status", params.status);
  }
  if (params.service && params.service.trim().length > 0) {
    query.set("service", params.service.trim());
  }
  if (params.page) {
    query.set("page", params.page.toString());
  }
  if (params.limit) {
    query.set("limit", params.limit.toString());
  }

  const url = `${getApiBaseUrl()}/api/alerts${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorMessage = `Failed to fetch alerts (${res.status} ${res.statusText})`;
    try {
      const errorData = await res.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  const json: AlertsResponse = await res.json();
  return json;
}

export async function fetchAlertCounts(): Promise<AlertCounts> {
  // Concurrently fetch counts for total and each severity tier
  const [totalRes, redRes, yellowRes, greenRes] = await Promise.all([
    fetchAlerts({ limit: 1 }),
    fetchAlerts({ severity: "RED", limit: 1 }),
    fetchAlerts({ severity: "YELLOW", limit: 1 }),
    fetchAlerts({ severity: "GREEN", limit: 1 }),
  ]);

  const red = redRes.pagination?.total ?? 0;
  const yellow = yellowRes.pagination?.total ?? 0;
  const green = greenRes.pagination?.total ?? 0;
  const total = Math.max(totalRes.pagination?.total ?? 0, red + yellow + green);

  return {
    total,
    red,
    yellow,
    green,
  };
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverviewResponse> {
  const url = `${getApiBaseUrl()}/api/analytics/overview`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorMessage = `Failed to fetch analytics (${res.status} ${res.statusText})`;
    try {
      const errorData = await res.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<AnalyticsOverviewResponse>;
}

export async function ingestAlert(
  payload: IngestAlertPayload
): Promise<IngestAlertResponse> {
  const url = `${getApiBaseUrl()}/api/alerts`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    let errorMessage = json?.message || `Failed to ingest alert (${res.status})`;
    if (json?.errors && Array.isArray(json.errors)) {
      errorMessage = json.errors.map((e: { message?: string }) => e.message || "Invalid field").join(", ");
    }
    throw new Error(errorMessage);
  }

  return json as IngestAlertResponse;
}

export async function deleteAlert(alertId: string): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/alerts/${encodeURIComponent(alertId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );

  if (!res.ok) {
    let errorMessage = `Failed to resolve alert (${res.status} ${res.statusText})`;
    try {
      const errorData = await res.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore non-JSON error responses.
    }
    throw new Error(errorMessage);
  }
}

export async function fetchServicesOverview(): Promise<ServicesResponse> {
  const url = `${getApiBaseUrl()}/api/services`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorMessage = `Failed to fetch services overview (${res.status} ${res.statusText})`;
    try {
      const errorData = await res.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<ServicesResponse>;
}

export async function checkBackendHealth(): Promise<{
  data: BackendHealthResponse;
  latencyMs: number;
}> {
  const start = performance.now();
  const url = `${getApiBaseUrl()}/health`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const latencyMs = Math.round(performance.now() - start);

  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as BackendHealthResponse;
  return { data, latencyMs };
}
