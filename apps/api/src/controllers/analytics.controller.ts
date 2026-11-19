import type { Request, Response } from "express";
import { getAnalyticsOverview } from "../repositories/analytics.repository.js";

export async function getAnalyticsOverviewHandler(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const data = await getAnalyticsOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[Analytics] Failed to get overview:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve analytics data",
    });
  }
}
