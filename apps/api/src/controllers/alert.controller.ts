import type { Request, Response } from "express";
import {
  createAlertSchema,
  getAlertsQuerySchema,
} from "../validators/alert.schema.js";
import {
  ingestAlertService,
  getAlertsService,
  deleteAlertService,
} from "../services/alert.service.js";

export async function ingestAlert(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = createAlertSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parseResult.error.issues,
      });
      return;
    }

    const { alert, isDuplicate, aiAnalysis } = await ingestAlertService(parseResult.data);

    if (isDuplicate) {
      res.status(200).json({
        success: true,
        message: "Duplicate alert detected; occurrence count incremented",
        data: alert,
        aiAnalysis: aiAnalysis ?? undefined,
        deduplicated: true,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Alert ingested successfully",
      data: alert,
      aiAnalysis: aiAnalysis ?? undefined,
      deduplicated: false,
    });
  } catch (error) {
    console.error("Error ingesting alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process alert",
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export async function getAlerts(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = getAlertsQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: parseResult.error.issues,
      });
      return;
    }

    const { alerts, pagination } = await getAlertsService(parseResult.data);

    res.status(200).json({
      success: true,
      data: alerts,
      pagination,
    });
  } catch (error) {
    console.error("Error retrieving alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve alerts",
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export async function deleteAlert(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await deleteAlertService(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Alert not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Alert marked as resolved and deleted",
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alert",
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
