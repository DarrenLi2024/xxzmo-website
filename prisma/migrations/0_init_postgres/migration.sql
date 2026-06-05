-- CreateTable
CREATE TABLE "Article" (
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
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '主题',
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnArticle" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "TagOnArticle_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "Painting" (
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
    "matchKeywords" TEXT NOT NULL DEFAULT '[]',
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Painting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmProvider" (
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
CREATE TABLE "DailyQuote" (
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
CREATE TABLE "SiteConfig" (
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
CREATE TABLE "AdminActionLog" (
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
CREATE TABLE "AiTaskLog" (
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
CREATE TABLE "PinyinDict" (
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
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE INDEX "Article_status_createdAt_idx" ON "Article"("status", "createdAt");
CREATE INDEX "Article_source_status_idx" ON "Article"("source", "status");
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
CREATE INDEX "Article_paintingId_idx" ON "Article"("paintingId");
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE INDEX "TagOnArticle_tagId_idx" ON "TagOnArticle"("tagId");

CREATE UNIQUE INDEX "Painting_externalId_key" ON "Painting"("externalId");

CREATE UNIQUE INDEX "LlmProvider_name_key" ON "LlmProvider"("name");
CREATE UNIQUE INDEX "DailyQuote_dateKey_key" ON "DailyQuote"("dateKey");

CREATE INDEX "AiTaskLog_taskName_createdAt_idx" ON "AiTaskLog"("taskName", "createdAt");
CREATE INDEX "AiTaskLog_success_createdAt_idx" ON "AiTaskLog"("success", "createdAt");

CREATE UNIQUE INDEX "PinyinDict_phrase_key" ON "PinyinDict"("phrase");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "Painting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TagOnArticle" ADD CONSTRAINT "TagOnArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TagOnArticle" ADD CONSTRAINT "TagOnArticle_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
