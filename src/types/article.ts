import { ARTICLE_TYPES } from "@/lib/constants";

export type ArticleType = (typeof ARTICLE_TYPES)[number];
export type ArticleSource = "chuli" | "jigu";
export type ArticleStatus = "draft" | "review" | "published";

export interface Annotation {
  term: string;
  explanation: string;
  sourceTitle?: string;
  sourceUrl?: string;
  quote?: string;
  confidence?: number;
}

export interface PaintingData {
  id: string;
  title: string;
  artist?: string;
  dynasty?: string;
  url: string;
  thumbnail?: string;
  tags: string[];
}

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  author: string;
  source: ArticleSource;
  type: ArticleType;
  dateRaw?: string | null;
  dateParsed?: string | null;
  tags: string[];
  status: ArticleStatus;
  confidence?: number | null;
  createdAt: string;
  publishedAt?: string | null;
}

export interface ArticleDetail extends ArticleListItem {
  preface?: string | null;
  body: string;
  postscript?: string | null;
  notes?: string | null;
  annotations?: Annotation[] | null;
  translation?: string | null;
  appreciation?: string | null;
  painting?: PaintingData | null;
  importBatch?: string | null;
  rawContent?: string | null;
  aiRawOutput?: unknown;
}

export interface DailyQuoteData {
  id: string;
  content: string;
  source: "ai_generated" | "from_collection";
  sourceRef?: string | null;
  aiPrompt?: string | null;
  dateKey: string;
}

export interface SiteConfigData {
  siteName: string;
  seoDesc?: string | null;
  authorName: string;
  authorTitle: string;
  avatarUrl: string;
  bio: string;
  signature: string;
  homeChuliCount: number;
  showStats: boolean;
  quoteSource: "collection_only" | "collection_first" | "ai_only";
  quoteAiStyle: string;
  importSeparator: string;
}
