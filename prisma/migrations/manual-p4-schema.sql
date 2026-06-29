-- P4 schema additions (run in Supabase SQL Editor if prisma db push times out)
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "contentFingerprint" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "contentEmbedding" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "embeddedAt" TIMESTAMP(3);

ALTER TABLE "AiWorkflowRun" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "AiWorkflowRun" ADD COLUMN IF NOT EXISTS "workerId" TEXT;

CREATE INDEX IF NOT EXISTS "Article_source_contentFingerprint_idx" ON "Article"("source", "contentFingerprint");
CREATE INDEX IF NOT EXISTS "AiWorkflowRun_lockedUntil_idx" ON "AiWorkflowRun"("lockedUntil");
