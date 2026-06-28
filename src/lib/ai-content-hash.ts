import { createHash } from "crypto";

interface ArticleContentInput {
  title: string;
  preface?: string | null;
  body: string;
  postscript?: string | null;
}

/** 文章内容指纹，用于跳过未变更的 AI 重处理 */
export function computeArticleContentHash(article: ArticleContentInput): string {
  const payload = [
    article.title.trim(),
    (article.preface || "").trim(),
    article.body.trim(),
    (article.postscript || "").trim(),
  ].join("\n---\n");

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function parseStepOutput<T extends Record<string, unknown>>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as T : null;
  } catch {
    return null;
  }
}
