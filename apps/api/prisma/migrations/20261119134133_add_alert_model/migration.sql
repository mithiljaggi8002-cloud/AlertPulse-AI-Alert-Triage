-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('RED', 'YELLOW', 'GREEN');

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "host" TEXT,
    "message" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'YELLOW',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiSummary" TEXT,
    "aiReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alert_fingerprint_key" ON "Alert"("fingerprint");

-- CreateIndex
CREATE INDEX "Alert_severity_status_idx" ON "Alert"("severity", "status");

-- CreateIndex
CREATE INDEX "Alert_service_idx" ON "Alert"("service");
