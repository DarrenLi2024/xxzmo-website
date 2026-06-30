import "server-only";
import { isCurrentArticlePinyinData } from "@/lib/article-pinyin";

interface ArticlePinyinSource {
  title: string;
  author: string;
  body: string;
  pinyin: string | null;
}

export interface ArticlePinyinPayload {
  bodyMap: Array<{ char: string; pinyin: string }>;
}

export function getStoredArticlePinyin(article: ArticlePinyinSource): ArticlePinyinPayload | null {
  if (!article.pinyin) return null;

  try {
    const pinyinData: unknown = JSON.parse(article.pinyin);
    if (!isCurrentArticlePinyinData(pinyinData, article)) return null;

    const data = pinyinData as {
      bodyMap?: Array<{ char: string; pinyin: string }>;
      pinyinMap?: Array<{ char: string; pinyin: string }>;
      title?: string;
    };

    if (data.bodyMap?.length) {
      return { bodyMap: data.bodyMap };
    }

    if (data.pinyinMap?.length) {
      const legacyTitleLength = data.title?.length || article.title.length;
      return { bodyMap: data.pinyinMap.slice(legacyTitleLength) };
    }
  } catch {
    return null;
  }

  return null;
}
