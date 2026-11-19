import { z } from "zod";

export const createAlertSchema = z.object({
  source: z.string().trim().min(1, "Source is required").max(100),
  service: z.string().trim().min(1, "Service is required").max(100),
  host: z.string().trim().max(255).nullish(),
  message: z.string().trim().min(1, "Message is required").max(2000),
  value: z.number().nullish(),
});

export const ingestAlertSchema = createAlertSchema;

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type IngestAlertInput = CreateAlertInput;

export const alertAiAnalysisSchema = z.object({
  summary: z.string().trim().min(1, "Summary is required"),
  possibleCause: z.string().trim().min(1, "Possible cause is required"),
  potentialImpact: z.string().trim().min(1, "Potential impact is required"),
  recommendedActions: z
    .array(z.string().trim().min(1))
    .min(1, "At least one recommended action is required"),
});

export type AlertAiAnalysis = z.infer<typeof alertAiAnalysisSchema>;

export const getAlertsQuerySchema = z.object({
  severity: z.enum(["RED", "YELLOW", "GREEN"]).optional(),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  service: z.string().trim().min(1).optional(),
  page: z.coerce.number().int("Page must be an integer").min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
});

export type GetAlertsQueryInput = z.infer<typeof getAlertsQuerySchema>;
