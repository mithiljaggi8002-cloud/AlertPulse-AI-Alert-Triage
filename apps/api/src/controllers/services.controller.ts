import type { Request, Response } from "express";
import { getServicesOverview } from "../repositories/services.repository.js";

export async function getServices(req: Request, res: Response): Promise<void> {
  try {
    const data = await getServicesOverview();
    res.status(200).json({
      success: true,
      message: "Services retrieved successfully",
      data: data.services,
      summary: data.summary,
    });
  } catch (error) {
    console.error("Error retrieving services overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve services overview",
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
