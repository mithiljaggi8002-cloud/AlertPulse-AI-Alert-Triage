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
  const orderedAlerts = shuffleAlerts(alerts);
  const apiBaseUrl = (process.env.ALERT_API_URL || "http://localhost:5000").replace(/\/+$/, "");
  const firstBatchSize = 10;
  const initialIntervalMs = Number(process.env.ALERT_INTERVAL_MS || 60_000);
  const laterIntervalMs = Number(process.env.ALERT_SLOW_INTERVAL_MS || 5 * 60_000);

  if (
    !Number.isFinite(initialIntervalMs) ||
    initialIntervalMs <= 0 ||
    !Number.isFinite(laterIntervalMs) ||
    laterIntervalMs <= 0
  ) {
    throw new Error("Alert feed intervals must be positive numbers");
  }

  if (process.argv.includes("--dry-run")) {
    console.log(
      `Validated ${orderedAlerts.length} alerts. First ${firstBatchSize} are sent every ${initialIntervalMs}ms; the rest every ${laterIntervalMs}ms. Randomized send order:`,
    );
    orderedAlerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.id} ${alert.service} (${alert.timestamp})`);
    });
    return;
  }

  console.log(
    `Sending ${orderedAlerts.length} alerts in random order to ${apiBaseUrl}; first ${firstBatchSize} every ${initialIntervalMs}ms, then every ${laterIntervalMs}ms.`,
  );

  for (const [index, alert] of orderedAlerts.entries()) {
    const requestStartedAt = Date.now();
    const response = await fetch(`${apiBaseUrl}/api/alerts`, {
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
      throw new Error(
        `Failed to send ${alert.id}: ${response.status} ${result.message || response.statusText}`,
      );
    }

    console.log(
      `[${index + 1}/${orderedAlerts.length}] ${alert.id} ${alert.service} (${alert.timestamp}) sent.`,
    );
    if (result.aiAnalysis?.summary) {
      console.log(`Gemini summary: ${result.aiAnalysis.summary}`);
    } else {
      console.warn(`Gemini summary unavailable for ${alert.id}; check API logs and key configuration.`);
    }

    if (index < orderedAlerts.length - 1) {
      const intervalMs = index + 1 < firstBatchSize ? initialIntervalMs : laterIntervalMs;
      const remainingInterval = intervalMs - (Date.now() - requestStartedAt);
      if (remainingInterval > 0) {
        await wait(remainingInterval);
      }
    }
  }

  console.log("Finished sending all 50 alerts.");
}

main().catch((error: unknown) => {
  console.error("Alert feed stopped:", error);
  process.exitCode = 1;
});
