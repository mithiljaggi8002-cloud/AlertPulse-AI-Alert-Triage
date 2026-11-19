import { Router } from "express";
import {
  ingestAlert,
  getAlerts,
  deleteAlert,
} from "../controllers/alert.controller.js";

const router = Router();

router.post("/", ingestAlert);
router.get("/", getAlerts);
router.delete("/:id", deleteAlert);

export default router;
