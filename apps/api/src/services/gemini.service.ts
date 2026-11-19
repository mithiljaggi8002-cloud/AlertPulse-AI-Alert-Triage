
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {
  alertAiAnalysisSchema,
  type AlertAiAnalysis,
} from "../validators/alert.schema.js";

const apiKey = process.env.GEMINI_API_KEY;
const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);
const ai = isConfigured ? new GoogleGenAI({ apiKey: apiKey!.trim() }) : null;

// Track connectivity telemetry without making expensive per-ping API calls
let lastVerifiedAt: string | null = null;
let lastErrorAt: string | null = null;
let lastErrorMessage: string | null = null;

export function getGeminiDiagnostics() {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (!isConfigured) {
    return {
      status: "UNCONFIGURED" as const,
      configured: false,
      model,
      lastVerifiedAt: null,
    };
  }

  // If a live request has succeeded, mark as AVAILABLE
  if (lastVerifiedAt && (!lastErrorAt || new Date(lastVerifiedAt) >= new Date(lastErrorAt))) {
    return {
      status: "AVAILABLE" as const,
      configured: true,
      model,
      lastVerifiedAt,
    };
  }

  // If a live request failed and hasn't succeeded since, mark as UNAVAILABLE
  if (lastErrorAt && (!lastVerifiedAt || new Date(lastErrorAt) > new Date(lastVerifiedAt))) {
    return {
      status: "UNAVAILABLE" as const,
      configured: true,
      model,
      lastVerifiedAt,
    };
  }

  // Credentials configured, waiting for first live invocation
  return {
    status: "CONFIGURED" as const,
    configured: true,
    model,
    lastVerifiedAt: null,
  };
}

function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return ai;
}

export interface AlertAnalysisPromptParams {
  source: string;
  service: string;
  host?: string | null;
  message: string;
  severity: string;
  occurrenceCount?: number;
  value?: number | null;
}

export async function generateAIResponse(
  prompt: string
): Promise<string> {
  if (!prompt.trim()) {
    throw new Error("Prompt cannot be empty");
  }

  const response = await getGeminiClient().models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

/**
 * Generates structured AI triage analysis for an operational alert.
 * Returns validated JSON matching the AlertAiAnalysis schema.
 */
export async function analyzeAlertWithGemini(
  params: AlertAnalysisPromptParams
): Promise<AlertAiAnalysis> {
  const hostPart = params.host ? `\n- Host: ${params.host}` : "";
  const valPart =
    params.value !== undefined && params.value !== null
      ? `\n- Observed Metric Value: ${params.value}`
      : "";
  const countPart =
    params.occurrenceCount && params.occurrenceCount > 1
      ? `\n- Occurrence Count: ${params.occurrenceCount}`
      : "";

  const prompt = `You are an expert site reliability engineer (SRE) and incident response analyst.
Analyze the following operational alert and produce a structured triage assessment in JSON format.

Alert Context:
- Source: ${params.source}
- Service: ${params.service}${hostPart}
- Alert Message: ${params.message}
- Deterministic Severity: ${params.severity}${valPart}${countPart}

Instructions:
1. Provide a concise, clear 1-sentence "summary" of what is happening.
2. Formulate a technical "possibleCause" (root cause analysis).
3. Explain the "potentialImpact" on users, systems, and downstream services.
4. List actionable "recommendedActions" (steps the on-call engineer should take).
5. DO NOT attempt to change or override the severity level.

You MUST reply with ONLY a valid JSON object matching this structure:
{
  "summary": "1-sentence summary",
  "possibleCause": "Technical root cause explanation",
  "potentialImpact": "Impact on systems and users",
  "recommendedActions": ["Immediate mitigation step 1", "Investigation step 2"]
}`;

  let responseText: string | undefined;

  const candidateModels = [
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ];

  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    try {
      const response = await getGeminiClient().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      responseText = response.text?.trim();
      if (responseText) {
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Try next model if available
    }
  }

  if (!responseText) {
    lastErrorAt = new Date().toISOString();
    lastErrorMessage = lastError ? lastError.message : "Empty response from Gemini";
    throw (
      lastError || new Error("Gemini returned an empty response from all models")
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (parseError) {
    lastErrorAt = new Date().toISOString();
    lastErrorMessage = "Invalid JSON returned by Gemini";
    throw new Error(
      `Failed to parse Gemini response as JSON: ${
        parseError instanceof Error ? parseError.message : "Invalid JSON"
      }`
    );
  }

  const validated = alertAiAnalysisSchema.parse(parsed);
  lastVerifiedAt = new Date().toISOString();
  lastErrorMessage = null;
  return validated;
}
