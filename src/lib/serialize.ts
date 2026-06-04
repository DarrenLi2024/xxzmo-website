import type { Article, TagOnArticle, Tag, Painting } from "@prisma/client";

type ArticleWithTags = Article & {
  tags: (TagOnArticle & { tag: Tag })[];
  painting?: Painting | null;
};

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  source: string;
  type: string;
  dateRaw: string | null;
  dateParsed: string | null;
  tags: string[];
  body: string;
  painting: PaintingInfo | null;
  status?: string;
  confidence?: number | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface ArticleDetailData extends ArticleListItem {
  preface: string | null;
  postscript: string | null;
  notes: string | null;
  annotations: AnnotationInfo[] | null;
  translation: string | null;
  appreciation: string | null;
  likeCount: number;
}

export interface AnnotationInfo {
  term: string;
  explanation: string;
  sourceTitle?: string;
  sourceUrl?: string;
  quote?: string;
  confidence?: number;
}

export interface ArticleAdminData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  source: string;
  type: string;
  dateRaw: string | null;
  preface: string | null;
  body: string;
  postscript: string | null;
  notes: string | null;
  annotations: string | null;
  translation: string | null;
  appreciation: string | null;
  reviewReport: string | null;
  rawContent: string | null;
  aiRawOutput: string | null;
  confidence: number | null;
  tags: string[];
  status: string;
  tagList: string;
  paintingId: string | null;
  painting?: PaintingInfo | null;
  createdAt: string;
}

export interface PaintingInfo {
  id: string;
  title: string;
  artist: string | null;
  dynasty: string | null;
  url: string;
  thumbnail: string | null;
  description: string | null;
  tags: string[];
}

export function serializeArticleListItem(a: ArticleWithTags, bodyLength = 200): ArticleListItem {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    author: a.author,
    source: a.source,
    type: a.type,
    dateRaw: a.dateRaw,
    dateParsed: a.dateParsed?.toISOString() ?? null,
    tags: a.tags.map((t) => t.tag.name),
    body: a.body.slice(0, bodyLength),
    painting: serializePainting(a.painting),
    status: a.status,
    confidence: a.confidence,
    createdAt: a.createdAt.toISOString(),
    publishedAt: a.publishedAt?.toISOString() ?? null,
  };
}

export function serializeArticleDetail(a: ArticleWithTags): ArticleDetailData {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    author: a.author,
    source: a.source,
    preface: a.preface,
    body: a.body,
    postscript: a.postscript,
    notes: a.notes,
    annotations: parseAnnotations(a.annotations),
    translation: a.translation,
    appreciation: a.appreciation,
    type: a.type,
    dateRaw: a.dateRaw,
    dateParsed: a.dateParsed?.toISOString() ?? null,
    tags: a.tags.map((t) => t.tag.name),
    painting: serializePainting(a.painting),
    status: a.status,
    confidence: a.confidence,
    createdAt: a.createdAt.toISOString(),
    publishedAt: a.publishedAt?.toISOString() ?? null,
    likeCount: a.likeCount ?? 0,
  };
}

export function serializeArticleAdmin(a: ArticleWithTags): ArticleAdminData {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    author: a.author,
    source: a.source,
    type: a.type,
    dateRaw: a.dateRaw,
    preface: a.preface,
    body: a.body,
    postscript: a.postscript,
    notes: a.notes,
    annotations: a.annotations,
    translation: a.translation,
    appreciation: a.appreciation,
    reviewReport: a.reviewReport,
    rawContent: a.rawContent,
    aiRawOutput: a.aiRawOutput,
    confidence: a.confidence,
    tags: a.tags.map((t) => t.tag.name),
    status: a.status,
    tagList: a.tagList,
    paintingId: a.paintingId,
    painting: serializePainting(a.painting),
    createdAt: a.createdAt.toISOString(),
  };
}

function serializePainting(p: Painting | null | undefined): PaintingInfo | null {
  if (!p) return null;
  if (!p.url.startsWith("/paintings/")) return null;
  return {
    id: p.id,
    title: p.title,
    artist: p.artist,
    dynasty: p.dynasty,
    url: p.url,
    thumbnail: p.thumbnail || p.url,
    description: p.description,
    tags: parseStringArray(p.tags),
  };
}

function parseAnnotations(raw: string | null): AnnotationInfo[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (item): item is AnnotationInfo =>
        typeof item?.term === "string" && typeof item?.explanation === "string"
    );
  } catch {
    return null;
  }
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
