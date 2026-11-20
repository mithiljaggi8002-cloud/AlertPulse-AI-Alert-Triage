import express from "express";
import userRouter from "../routes/user.routes.js";
import alertRouter from "../routes/alert.routes.js";
import analyticsRouter from "../routes/analytics.routes.js";
import servicesRouter from "../routes/services.routes.js";
import { getGeminiDiagnostics } from "../services/gemini.service.js";
import cors from "cors";
import helmet from "helmet";

const app = express();

// Security middleware - permit cross-origin resource access for frontend
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Allowed origins
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  : [];

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...configuredOrigins,
]);

// Enable cross-origin requests
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. server-to-server, health probes, curl)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");

      // Allow configured origins or local development origins
      if (
        allowedOrigins.has(normalizedOrigin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // Reject all other unconfigured origins
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Parse incoming JSON request bodies
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    gemini: getGeminiDiagnostics(),
  });
});

// User routes
app.use("/api/users", userRouter);

// Alert routes
app.use("/api/alerts", alertRouter);

// Analytics routes
app.use("/api/analytics", analyticsRouter);

// Services routes
app.use("/api/services", servicesRouter);

export default app;
