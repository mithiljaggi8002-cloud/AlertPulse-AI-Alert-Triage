import { Router } from "express";
import { getAnalyticsOverviewHandler } from "../controllers/analytics.controller.js";

const analyticsRouter = Router();

analyticsRouter.get("/overview", getAnalyticsOverviewHandler);

export default analyticsRouter;
