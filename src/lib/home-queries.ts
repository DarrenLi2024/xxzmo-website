import "server-only";
import { prisma } from "@/lib/prisma";
import type { Article, TagOnArticle, Tag, Painting } from "@prisma/client";

// ============================================================
// 首页精确查询 — 只选取需要的字段 + 利用索引
// ============================================================

type ArticleWithTagsAndPainting = Article & {
  tags: (TagOnArticle & { tag: Tag })[];
  painting: Painting | null;
};

// Hero 文章 — 取最新 1 篇带配图的
const heroSelect = {
  id: true, slug: true, title: true, author: true, source: true, type: true, body: true,
  createdAt: true, publishedAt: true,
  tags: { select: { tag: { select: { name: true } } } },
  painting: { select: { id: true, title: true, artist: true, dynasty: true, url: true, thumbnail: true, description: true, tags: true } },
  status: true,
} as const;

// Featured 迷你卡 — 取 4 篇带配图的
const featuredSelect = {
  id: true, slug: true, title: true, author: true, source: true, type: true, body: true,
  tags: { select: { tag: { select: { name: true } } } },
  painting: { select: { id: true, title: true, artist: true, dynasty: true, url: true, thumbnail: true, description: true, tags: true } },
} as const;

// 主题分组文章 — 取 body 前 80 字
const topicSelect = {
  id: true, slug: true, title: true, source: true, type: true, body: true,
  createdAt: true,
  tags: { select: { tag: { select: { name: true } } } },
  painting: { select: { id: true, title: true, artist: true, dynasty: true, url: true, thumbnail: true, description: true, tags: true } },
} as const;

export interface HeroArticle {
  id: string; slug: string; title: string; author: string; source: string; type: string;
  body: string; createdAt: Date; publishedAt: Date | null; status: string;
  tags: string[];
  painting: { id: string; title: string; artist: string | null; dynasty: string | null; url: string; thumbnail: string | null; description: string | null; tags: string[] } | null;
}

export interface FeaturedArticle {
  id: string; slug: string; title: string; author: string; source: string; type: string;
  body: string;
  tags: string[];
  painting: { id: string; title: string; artist: string | null; dynasty: string | null; url: string; thumbnail: string | null; description: string | null; tags: string[] } | null;
}

export interface TopicArticle {
  id: string; slug: string; title: string; source: string; type: string; body: string;
  createdAt: Date;
  tags: string[];
  painting: { id: string; title: string; artist: string | null; dynasty: string | null; url: string; thumbnail: string | null; description: string | null; tags: string[] } | null;
}

export interface HomeStats {
  totalPublished: number;
  chuliCount: number;
  jiguCount: number;
  recentUpdatedAt: Date | null;
}

/**
 * 首页统计 — 使用 COUNT 聚合，不取正文
 */
export async function getHomeStats(): Promise<HomeStats> {
  const [totalPublished, chuliCount, jiguCount, recentArticle] = await Promise.all([
    prisma.article.count({ where: { status: "published" } }),
    prisma.article.count({ where: { status: "published", source: "chuli" } }),
    prisma.article.count({ where: { status: "published", source: "jigu" } }),
    prisma.article.findFirst({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    totalPublished,
    chuliCount,
    jiguCount,
    recentUpdatedAt: recentArticle?.createdAt ?? null,
  };
}

/**
 * Hero 文章 — 最新 1 篇带配图的已发布文章
 */
export async function getHeroArticle(): Promise<HeroArticle | null> {
  const article = await prisma.article.findFirst({
    where: {
      status: "published",
      paintingId: { not: null },
      painting: { is: { url: { startsWith: "/paintings/" } } },
    },
    orderBy: { createdAt: "desc" },
    select: heroSelect,
  });

  if (!article) return null;
  return serializeHeroArticle(article as any);
}

/**
 * Featured 文章 — 除 Hero 外剩余带配图的 4 篇
 */
export async function getFeaturedArticles(excludeId?: string): Promise<FeaturedArticle[]> {
  const articles = await prisma.article.findMany({
    where: {
      status: "published",
      paintingId: { not: null },
      painting: { is: { url: { startsWith: "/paintings/" } } },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: featuredSelect,
    take: 4,
  });

  return articles.map(a => serializeFeaturedArticle(a as any));
}

/**
 * 主题分组 — 8 组标签，各取 6 篇
 */
const TOPIC_GROUPS: Record<string, string[]> = {
  "节序时令": ["春节", "清明", "中秋", "重阳", "除夕", "立春", "春景", "秋景", "时令", "白露", "冬至", "元日", "上元"],
  "怀古咏史": ["怀古", "咏史", "历史", "魏晋", "隋唐", "三国"],
  "羁旅思亲": ["思乡", "羁旅", "怀人", "思亲", "悼亡", "母亲", "父亲"],
  "田园隐逸": ["田园", "隐逸", "山水", "闲适", "写景", "登临"],
  "感怀遣愁": ["愁绪", "感怀", "孤寂", "咏怀", "梦", "夜"],
  "赠答酬唱": ["赠答", "友情", "送别", "爱情", "闺怨"],
  "咏物写意": ["咏物", "写雪", "梅花", "柳树", "写山", "黄河", "写马", "饮酒"],
  "励志感时": ["励志", "惜时", "哲理", "读书"],
};

export interface TopicGroup {
  key: string;
  label: string;
  articles: TopicArticle[];
}

/**
 * 主题分组查询 — 一次取所有已发布文章（不超过 200），客户端按标签分组
 */
export async function getTopicGroups(): Promise<TopicGroup[]> {
  const articles = await prisma.article.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
    select: topicSelect,
    take: 200,
  });

  const list: TopicArticle[] = articles.map(a => serializeTopicArticle(a as any));

  const groups: TopicGroup[] = Object.entries(TOPIC_GROUPS).map(([key, tags]) => {
    const matched = list.filter(a => a.tags.some(t => tags.includes(t))).slice(0, 6);
    return { key, label: key, articles: matched };
  }).filter(g => g.articles.length > 0);

  return groups;
}

// ============================================================
// 序列化辅助
// ============================================================

function serializeHeroArticle(a: any): HeroArticle {
  const painting = serializeLocalPainting(a.painting);
  return {
    id: a.id, slug: a.slug, title: a.title, author: a.author, source: a.source,
    type: a.type, body: a.body, createdAt: a.createdAt, publishedAt: a.publishedAt,
    status: a.status,
    tags: a.tags.map((t: any) => t.tag.name),
    painting,
  };
}

function serializeFeaturedArticle(a: any): FeaturedArticle {
  const painting = serializeLocalPainting(a.painting);
  return {
    id: a.id, slug: a.slug, title: a.title, author: a.author, source: a.source,
    type: a.type, body: a.body,
    tags: a.tags.map((t: any) => t.tag.name),
    painting,
  };
}

function serializeTopicArticle(a: any): TopicArticle {
  const painting = serializeLocalPainting(a.painting);
  return {
    id: a.id, slug: a.slug, title: a.title, source: a.source,
    type: a.type, body: a.body, createdAt: a.createdAt,
    tags: a.tags.map((t: any) => t.tag.name),
    painting,
  };
}

function serializeLocalPainting(painting: any) {
  if (!painting || typeof painting.url !== "string" || !painting.url.startsWith("/paintings/")) return null;
  return {
    ...painting,
    tags: parseStringArray(painting.tags),
  };
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item: unknown): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
