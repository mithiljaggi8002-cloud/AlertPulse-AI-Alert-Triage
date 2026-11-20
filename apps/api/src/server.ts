import "dotenv/config";
import express from "express";
import app from "./app/app.js";

const PORT = process.env.PORT || 5000;

// Start standalone HTTP listener for local development and non-serverless environments
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

// Export default Express application for Vercel serverless request handling
export default app;
