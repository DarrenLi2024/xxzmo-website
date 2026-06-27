-- Add persistent AI workflow state for background article processing.
ALTER TABLE "Article" ADD COLUMN "aiStatus" TEXT;
ALTER TABLE "Article" ADD COLUMN "aiConfidence" DOUBLE PRECISION;
ALTER TABLE "Article" ADD COLUMN "aiRiskLevel" TEXT;
ALTER TABLE "Article" ADD COLUMN "aiUpdatedAt" TIMESTAMP(3);

CREATE TABLE "AiWorkflowRun" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "batchId" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "policy" TEXT NOT NULL DEFAULT 'standard',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "riskLevel" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiWorkflowRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiWorkflowStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "order" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "input" TEXT,
    "output" TEXT,
    "error" TEXT,
    "durationMs" INTEGER,
    "aiLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiWorkflowStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Article_source_aiStatus_idx" ON "Article"("source", "aiStatus");
CREATE INDEX "Article_aiStatus_aiUpdatedAt_idx" ON "Article"("aiStatus", "aiUpdatedAt");
CREATE INDEX "AiWorkflowRun_status_priority_createdAt_idx" ON "AiWorkflowRun"("status", "priority", "createdAt");
CREATE INDEX "AiWorkflowRun_articleId_idx" ON "AiWorkflowRun"("articleId");
CREATE INDEX "AiWorkflowRun_batchId_idx" ON "AiWorkflowRun"("batchId");
CREATE INDEX "AiWorkflowStep_runId_order_idx" ON "AiWorkflowStep"("runId", "order");
CREATE INDEX "AiWorkflowStep_status_updatedAt_idx" ON "AiWorkflowStep"("status", "updatedAt");

ALTER TABLE "AiWorkflowStep" ADD CONSTRAINT "AiWorkflowStep_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "AiWorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
