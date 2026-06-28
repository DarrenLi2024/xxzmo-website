import { PrismaClient } from "@prisma/client";
import fs from "fs";

// 连接 Supabase（使用本地 .env 中的 DATABASE_URL）
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
  log: ["error"],
});

function loadJson(path: string): any[] {
  const raw = fs.readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function toDate(val: number | string | null): Date | undefined {
  if (!val) return undefined;
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    return undefined;
  }
  return new Date(val);
}

function toBool(val: number | null): boolean {
  return val === 1;
}

async function migrate() {
  console.log("=== 开始批量迁移到 Supabase ===");

  // 1. Tag - createMany
  const tags = loadJson("/tmp/tags.json");
  console.log(`Tag: ${tags.length} 条`);
  await prisma.tag.createMany({
    data: tags.map((t: any) => ({
      id: t.id,
      name: t.name,
      category: t.category ?? "主题",
      count: t.count ?? 0,
      createdAt: toDate(t.createdAt) ?? new Date(),
    })),
    skipDuplicates: true,
  });

  // 2. Painting - createMany
  const paintings = loadJson("/tmp/paintings.json");
  console.log(`Painting: ${paintings.length} 条`);
  await prisma.painting.createMany({
    data: paintings.map((p: any) => ({
      id: p.id,
      title: p.title,
      artist: p.artist ?? null,
      dynasty: p.dynasty ?? null,
      url: p.url,
      thumbnail: p.thumbnail ?? null,
      tags: p.tags ?? "[]",
      createdAt: toDate(p.createdAt) ?? new Date(),
      externalId: p.externalId ?? null,
      externalSource: p.externalSource ?? null,
      description: p.description ?? null,
      matchKeywords: p.matchKeywords ?? "[]",
      matchCount: p.matchCount ?? 0,
    })),
    skipDuplicates: true,
  });

  // 3. Article - createMany
  const articles = loadJson("/tmp/articles.json");
  console.log(`Article: ${articles.length} 条`);
  await prisma.article.createMany({
    data: articles.map((a: any) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      subtitle: a.subtitle ?? null,
      author: a.author ?? "狂野君",
      source: a.source,
      preface: a.preface ?? null,
      body: a.body,
      postscript: a.postscript ?? null,
      notes: a.notes ?? null,
      pinyin: a.pinyin ?? null,
      annotations: a.annotations ?? null,
      translation: a.translation ?? null,
      appreciation: a.appreciation ?? null,
      formatAnalysis: a.formatAnalysis ?? null,
      reviewReport: a.reviewReport ?? null,
      type: a.type,
      dateRaw: a.dateRaw ?? null,
      dateParsed: toDate(a.dateParsed) ?? null,
      tagList: a.tagList ?? "[]",
      paintingId: a.paintingId ?? null,
      status: a.status ?? "draft",
      featured: toBool(a.featured),
      createdAt: toDate(a.createdAt) ?? new Date(),
      updatedAt: toDate(a.updatedAt) ?? new Date(),
      publishedAt: toDate(a.publishedAt) ?? null,
      sortOrder: a.sortOrder ?? null,
      importBatch: a.importBatch ?? null,
      rawContent: a.rawContent ?? null,
      aiRawOutput: a.aiRawOutput ?? null,
      confidence: a.confidence ?? null,
      aiStatus: a.aiStatus ?? null,
      aiConfidence: a.aiConfidence ?? null,
      aiRiskLevel: a.aiRiskLevel ?? null,
      aiUpdatedAt: toDate(a.aiUpdatedAt) ?? null,
      likeCount: a.likeCount ?? 0,
    })),
    skipDuplicates: true,
  });

  // 4. TagOnArticle - createMany
  const tagOnArticles = loadJson("/tmp/tagonarticles.json");
  console.log(`TagOnArticle: ${tagOnArticles.length} 条`);
  await prisma.tagOnArticle.createMany({
    data: tagOnArticles.map((t: any) => ({
      articleId: t.articleId,
      tagId: t.tagId,
    })),
    skipDuplicates: true,
  });

  // 5. SiteConfig - createMany
  const siteConfigs = loadJson("/tmp/siteconfigs.json");
  console.log(`SiteConfig: ${siteConfigs.length} 条`);
  await prisma.siteConfig.createMany({
    data: siteConfigs.map((s: any) => ({
      id: s.id,
      siteName: s.siteName ?? "闲心子墨",
      seoDesc: s.seoDesc ?? null,
      authorName: s.authorName ?? "狂野君",
      authorTitle: s.authorTitle ?? null,
      avatarUrl: s.avatarUrl ?? null,
      bio: s.bio ?? null,
      signature: s.signature ?? null,
      homeChuliCount: s.homeChuliCount ?? 10,
      showStats: toBool(s.showStats),
      quoteSource: s.quoteSource ?? "collection_first",
      quoteAiStyle: s.quoteAiStyle ?? null,
      importSeparator: s.importSeparator ?? "---",
      postsPerPage: s.postsPerPage ?? 10,
      quoteStrategy: s.quoteStrategy ?? "latest",
      aiStyle: s.aiStyle ?? null,
      createdAt: toDate(s.createdAt) ?? new Date(),
      updatedAt: toDate(s.updatedAt) ?? new Date(),
    })),
    skipDuplicates: true,
  });

  // 6. DailyQuote - createMany
  const dailyQuotes = loadJson("/tmp/dailyquotes.json");
  console.log(`DailyQuote: ${dailyQuotes.length} 条`);
  await prisma.dailyQuote.createMany({
    data: dailyQuotes.map((q: any) => ({
      id: q.id,
      content: q.content,
      source: q.source,
      sourceRef: q.sourceRef ?? null,
      aiPrompt: q.aiPrompt ?? null,
      dateKey: q.dateKey,
      createdAt: toDate(q.createdAt) ?? new Date(),
    })),
    skipDuplicates: true,
  });

  // 7. LlmProvider - createMany
  const llmProviders = loadJson("/tmp/llmproviders.json");
  console.log(`LlmProvider: ${llmProviders.length} 条`);
  await prisma.llmProvider.createMany({
    data: llmProviders.map((p: any) => ({
      id: p.id,
      name: p.name,
      label: p.label,
      baseUrl: p.baseUrl,
      model: p.model,
      apiKey: p.apiKey ?? null,
      priority: p.priority ?? 0,
      enabled: toBool(p.enabled),
      createdAt: toDate(p.createdAt) ?? new Date(),
      updatedAt: toDate(p.updatedAt) ?? new Date(),
    })),
    skipDuplicates: true,
  });

  // 8. PinyinDict - createMany
  const pinyinDicts = loadJson("/tmp/pinyindicts.json");
  console.log(`PinyinDict: ${pinyinDicts.length} 条`);
  await prisma.pinyinDict.createMany({
    data: pinyinDicts.map((p: any) => ({
      id: p.id,
      phrase: p.phrase,
      pinyin: p.pinyin,
      category: p.category ?? "通假字",
      source: p.source ?? null,
      verified: toBool(p.verified),
      aiLogId: p.aiLogId ?? null,
      createdAt: toDate(p.createdAt) ?? new Date(),
      updatedAt: toDate(p.updatedAt) ?? new Date(),
    })),
    skipDuplicates: true,
  });

  console.log("=== 迁移完成 ===");

  // 验证
  const articleCount = await prisma.article.count();
  const tagCount = await prisma.tag.count();
  const paintingCount = await prisma.painting.count();
  const siteConfigCount = await prisma.siteConfig.count();
  const dailyQuoteCount = await prisma.dailyQuote.count();
  const llmProviderCount = await prisma.llmProvider.count();
  const pinyinDictCount = await prisma.pinyinDict.count();
  console.log(`验证: Article=${articleCount}, Tag=${tagCount}, Painting=${paintingCount}, SiteConfig=${siteConfigCount}, DailyQuote=${dailyQuoteCount}, LlmProvider=${llmProviderCount}, PinyinDict=${pinyinDictCount}`);
}

migrate()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
