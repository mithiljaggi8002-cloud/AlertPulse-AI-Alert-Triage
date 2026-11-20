import { readFile } from "node:fs/promises";
import { z } from "zod";

const feedAlertSchema = z.object({
  id: z.string().min(1),
  service: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().min(1),
});

const feedSchema = z.array(feedAlertSchema).length(50);

type FeedAlert = z.infer<typeof feedAlertSchema>;

interface IngestResponse {
  message?: string;
  aiAnalysis?: {
    summary?: string;
  };
}

function shuffleAlerts(alerts: FeedAlert[]): FeedAlert[] {
  const shuffled = [...alerts];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const fileContents = await readFile(
    new URL("../../data/alerts.json", import.meta.url),
    "utf8",
  );
  const alerts = feedSchema.parse(JSON.parse(fileContents));
  const rawApiUrls = process.env.ALERT_API_URL || "http://localhost:5000,https://alert-pulse-api.vercel.app";
  const apiBaseUrls = rawApiUrls
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const initialIntervalMs = Number(process.env.ALERT_INTERVAL_MS || 60_000);
  const laterIntervalMs = Number(process.env.ALERT_SLOW_INTERVAL_MS || initialIntervalMs);
  const firstBatchSize = Number(process.env.ALERT_FIRST_BATCH_SIZE || 50);
  const shouldLoop = process.env.ALERT_LOOP !== "false";

  if (
    !Number.isFinite(initialIntervalMs) ||
    initialIntervalMs <= 0 ||
    !Number.isFinite(laterIntervalMs) ||
    laterIntervalMs <= 0
  ) {
    throw new Error("Alert feed intervals must be positive numbers");
  }

  console.log(
    `Starting alert replay feed: sending 50 alerts every ${initialIntervalMs}ms to ${apiBaseUrls.join(" and ")} (loop=${shouldLoop})`,
  );

  do {
    const orderedAlerts = shuffleAlerts(alerts);

    for (const [index, alert] of orderedAlerts.entries()) {
      const requestStartedAt = Date.now();

      await Promise.allSettled(
        apiBaseUrls.map(async (apiUrl) => {
          try {
            const response = await fetch(`${apiUrl}/api/alerts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source: `json-feed:${alert.id}`,
                service: alert.service,
                message: alert.message,
              }),
            });
            const result = (await response.json()) as IngestResponse;

            if (!response.ok) {
              console.error(
                `Failed to send ${alert.id} to ${apiUrl}: ${response.status} ${result.message || response.statusText}`,
              );
            } else {
              console.log(
                `[${index + 1}/${orderedAlerts.length}] ${alert.id} ${alert.service} (${alert.timestamp}) -> ${apiUrl}`,
              );
            }
          } catch (err: any) {
            console.error(`Network error sending ${alert.id} to ${apiUrl}:`, err?.message || err);
          }
        }),
      );

      const intervalMs = index + 1 < firstBatchSize ? initialIntervalMs : laterIntervalMs;
      const remainingInterval = intervalMs - (Date.now() - requestStartedAt);
      if (remainingInterval > 0) {
        await wait(remainingInterval);
      }
    }

    if (shouldLoop) {
      console.log("Completed 50-alert cycle. Repeating cycle in 60s...");
      await wait(initialIntervalMs);
    }
  } while (shouldLoop);

  console.log("Finished sending alerts.");
}

main().catch((error: unknown) => {
  console.error("Alert feed stopped:", error);
  process.exitCode = 1;
});
