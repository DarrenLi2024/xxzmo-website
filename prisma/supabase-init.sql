-- 樗栎集 AI Native 数据库初始化 SQL
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- 生成时间: 2026-06-27
-- 来源: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "author" TEXT NOT NULL DEFAULT '狂野君',
    "source" TEXT NOT NULL,
    "preface" TEXT,
    "body" TEXT NOT NULL,
    "postscript" TEXT,
    "notes" TEXT,
    "pinyin" TEXT,
    "annotations" TEXT,
    "translation" TEXT,
    "appreciation" TEXT,
    "formatAnalysis" TEXT,
    "reviewReport" TEXT,
    "type" TEXT NOT NULL,
    "dateRaw" TEXT,
    "dateParsed" TIMESTAMP(3),
    "tagList" TEXT NOT NULL DEFAULT '[]',
    "paintingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "sortOrder" DOUBLE PRECISION,
    "importBatch" TEXT,
    "rawContent" TEXT,
    "aiRawOutput" TEXT,
    "confidence" DOUBLE PRECISION,
    "aiStatus" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiRiskLevel" TEXT,
    "aiUpdatedAt" TIMESTAMP(3),
    "likeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '主题',
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TagOnArticle" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TagOnArticle_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Painting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "dynasty" TEXT,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalId" TEXT,
    "externalSource" TEXT,
    "description" TEXT,
    "matchKeywords" TEXT DEFAULT '[]',
    "matchCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Painting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LlmProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "apiKey" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DailyQuote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "aiPrompt" TEXT,
    "dateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteConfig" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT '闲心子墨',
    "seoDesc" TEXT,
    "authorName" TEXT NOT NULL DEFAULT '狂野君',
    "authorTitle" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "signature" TEXT,
    "homeChuliCount" INTEGER NOT NULL DEFAULT 10,
    "showStats" BOOLEAN NOT NULL DEFAULT true,
    "quoteSource" TEXT NOT NULL DEFAULT 'collection_first',
    "quoteAiStyle" TEXT,
    "importSeparator" TEXT NOT NULL DEFAULT '---',
    "postsPerPage" INTEGER NOT NULL DEFAULT 10,
    "quoteStrategy" TEXT NOT NULL DEFAULT 'latest',
    "aiStyle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminActionLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiTaskLog" (
    "id" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "providerName" TEXT,
    "providerModel" TEXT,
    "temperature" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "rawOutputPreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTaskLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiWorkflowRun" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiWorkflowStep" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiArtifact" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiDecision" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiFeedback" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "PinyinDict" (
    "id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '通假字',
    "source" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "aiLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinyinDict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Article_slug_key" ON "Article"("slug");
CREATE INDEX IF NOT EXISTS "Article_status_createdAt_idx" ON "Article"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Article_source_status_idx" ON "Article"("source", "status");
CREATE INDEX IF NOT EXISTS "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "Article_paintingId_idx" ON "Article"("paintingId");
CREATE INDEX IF NOT EXISTS "Article_createdAt_idx" ON "Article"("createdAt");
CREATE INDEX IF NOT EXISTS "Article_source_status_createdAt_idx" ON "Article"("source", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Article_source_status_slug_idx" ON "Article"("source", "status", "slug");
CREATE INDEX IF NOT EXISTS "Article_source_aiStatus_idx" ON "Article"("source", "aiStatus");
CREATE INDEX IF NOT EXISTS "Article_aiStatus_aiUpdatedAt_idx" ON "Article"("aiStatus", "aiUpdatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE INDEX IF NOT EXISTS "TagOnArticle_tagId_idx" ON "TagOnArticle"("tagId");

CREATE UNIQUE INDEX IF NOT EXISTS "Painting_externalId_key" ON "Painting"("externalId");

CREATE UNIQUE INDEX IF NOT EXISTS "LlmProvider_name_key" ON "LlmProvider"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyQuote_dateKey_key" ON "DailyQuote"("dateKey");

CREATE INDEX IF NOT EXISTS "AiTaskLog_taskName_createdAt_idx" ON "AiTaskLog"("taskName", "createdAt");
CREATE INDEX IF NOT EXISTS "AiTaskLog_success_createdAt_idx" ON "AiTaskLog"("success", "createdAt");

CREATE INDEX IF NOT EXISTS "AiWorkflowRun_status_priority_createdAt_idx" ON "AiWorkflowRun"("status", "priority", "createdAt");
CREATE INDEX IF NOT EXISTS "AiWorkflowRun_articleId_idx" ON "AiWorkflowRun"("articleId");
CREATE INDEX IF NOT EXISTS "AiWorkflowRun_batchId_idx" ON "AiWorkflowRun"("batchId");

CREATE INDEX IF NOT EXISTS "AiWorkflowStep_runId_order_idx" ON "AiWorkflowStep"("runId", "order");
CREATE INDEX IF NOT EXISTS "AiWorkflowStep_status_updatedAt_idx" ON "AiWorkflowStep"("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "AiArtifact_articleId_type_version_idx" ON "AiArtifact"("articleId", "type", "version");
CREATE INDEX IF NOT EXISTS "AiArtifact_runId_idx" ON "AiArtifact"("runId");
CREATE INDEX IF NOT EXISTS "AiArtifact_articleId_createdAt_idx" ON "AiArtifact"("articleId", "createdAt");

CREATE INDEX IF NOT EXISTS "AiDecision_articleId_stepName_idx" ON "AiDecision"("articleId", "stepName");
CREATE INDEX IF NOT EXISTS "AiDecision_runId_idx" ON "AiDecision"("runId");
CREATE INDEX IF NOT EXISTS "AiDecision_articleId_decision_idx" ON "AiDecision"("articleId", "decision");

CREATE INDEX IF NOT EXISTS "AiFeedback_articleId_idx" ON "AiFeedback"("articleId");
CREATE INDEX IF NOT EXISTS "AiFeedback_runId_idx" ON "AiFeedback"("runId");
CREATE INDEX IF NOT EXISTS "AiFeedback_articleId_action_idx" ON "AiFeedback"("articleId", "action");

CREATE UNIQUE INDEX IF NOT EXISTS "PinyinDict_phrase_key" ON "PinyinDict"("phrase");

-- AddForeignKey
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_paintingId_fkey";
ALTER TABLE "Article" ADD CONSTRAINT "Article_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "Painting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TagOnArticle" DROP CONSTRAINT IF EXISTS "TagOnArticle_articleId_fkey";
ALTER TABLE "TagOnArticle" ADD CONSTRAINT "TagOnArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TagOnArticle" DROP CONSTRAINT IF EXISTS "TagOnArticle_tagId_fkey";
ALTER TABLE "TagOnArticle" ADD CONSTRAINT "TagOnArticle_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiWorkflowStep" DROP CONSTRAINT IF EXISTS "AiWorkflowStep_runId_fkey";
ALTER TABLE "AiWorkflowStep" ADD CONSTRAINT "AiWorkflowStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiWorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 完成提示
SELECT '✅ 数据库表创建完成！' AS result;
