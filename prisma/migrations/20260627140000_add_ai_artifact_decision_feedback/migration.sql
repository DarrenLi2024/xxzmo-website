-- Add AI artifact, decision, and feedback tables for AI Native multi-AI collaboration.
-- These tables enable versioned AI outputs, decision tracking, and human feedback loops.

CREATE TABLE "AiArtifact" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT,
    "articleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiDecision" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "reasons" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT,
    "runId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "contentBefore" TEXT,
    "contentAfter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- Indexes for AiArtifact
CREATE INDEX "AiArtifact_articleId_type_version_idx" ON "AiArtifact"("articleId", "type", "version");
CREATE INDEX "AiArtifact_runId_idx" ON "AiArtifact"("runId");
CREATE INDEX "AiArtifact_articleId_createdAt_idx" ON "AiArtifact"("articleId", "createdAt");

-- Indexes for AiDecision
CREATE INDEX "AiDecision_articleId_stepName_idx" ON "AiDecision"("articleId", "stepName");
CREATE INDEX "AiDecision_runId_idx" ON "AiDecision"("runId");
CREATE INDEX "AiDecision_articleId_decision_idx" ON "AiDecision"("articleId", "decision");

-- Indexes for AiFeedback
CREATE INDEX "AiFeedback_articleId_idx" ON "AiFeedback"("articleId");
CREATE INDEX "AiFeedback_runId_idx" ON "AiFeedback"("runId");
CREATE INDEX "AiFeedback_articleId_action_idx" ON "AiFeedback"("articleId", "action");
