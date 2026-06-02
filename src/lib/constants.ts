export const SITE = {
  name: "闲心子墨",
  authorName: "狂野君",
  authorTitle: "山房主人",
  signature: "樗栎本无用，天地一散人",
  bio: "性喜山林，偶作诗文",
  avatarUrl: "/images/avatar.jpg",
  seoDesc: "狂野君的诗文空间 — 樗栎集原创 · 辑古录经典",
} as const;

export const NAV_ITEMS = [
  { label: "樗栎集", href: "/chuli" },
  { label: "辑古录", href: "/jigu" },
  { label: "关于", href: "/about" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "仪表盘", href: "/admin", icon: "LayoutDashboard" },
  { label: "樗栎集管理", href: "/admin/chuli", icon: "PenLine" },
  { label: "辑古录管理", href: "/admin/jigu", icon: "BookOpen" },
  { label: "辑古台", href: "/admin/jigu-tai", icon: "Sparkles" },
  { label: "标签管理", href: "/admin/tags", icon: "Tags" },
  { label: "配图库", href: "/admin/paintings", icon: "Image" },
  { label: "API 配置", href: "/admin/api-config", icon: "Plug" },
  { label: "系统设置", href: "/admin/settings", icon: "Settings" },
] as const;

export const ARTICLE_TYPES = [
  "诗", "词", "曲", "赋", "文", "联", "新诗", "打油诗", "四言", "六言", "杂言", "骚体", "长短句", "剧本", "朗诵稿", "随笔", "日记"
] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export const ARTICLE_STATUS = ["draft", "review", "published"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUS)[number];

export const ARTICLE_SOURCES = ["chuli", "jigu"] as const;
export type ArticleSource = (typeof ARTICLE_SOURCES)[number];

// Display constants
export const EXCERPT_MAX_LENGTH = 80;
export const MAX_VISIBLE_TAGS = 6;
export const DEFAULT_PAGE_SIZE = 10;
export const HOME_PAGE_SIZE = 5;
export const ADMIN_PAGE_SIZE = 50;

// Caching
export const ISR_REVALIDATE = 60;
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// Rate limiting
export const AUTH_RATE_LIMIT = { max: 5, windowMs: 60000 } as const;

// Import defaults
export const DEFAULT_IMPORT_SEPARATOR = "---";
