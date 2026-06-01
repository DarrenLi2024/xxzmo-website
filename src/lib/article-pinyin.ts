import { customPinyin, pinyin } from "pinyin-pro";

export interface PinyinMapItem {
  char: string;
  pinyin: string;
}

export interface ArticlePinyinData {
  version: number;
  title: string;
  author: string;
  body: string;
  titleMap: PinyinMapItem[];
  authorMap: PinyinMapItem[];
  bodyMap: PinyinMapItem[];
  /** Kept for clients that loaded the original combined-map response shape. */
  pinyinMap: PinyinMapItem[];
  calibration?: {
    promptVersion: string;
    reviewedAt: string;
    logId: string | null;
    providerModel: string;
    corrections: AppliedPinyinCorrection[];
    uncertain: string[];
  };
}

export type PinyinField = "title" | "author" | "body";

export interface ContextPinyinCorrection {
  field: PinyinField;
  text: string;
  occurrence: number;
  pinyin: string[];
  reason: string;
  confidence: number;
}

export interface AppliedPinyinCorrection extends ContextPinyinCorrection {
  start: number;
}

export const ARTICLE_PINYIN_VERSION = 5;

// Extend this reviewed lexicon as classical names and established readings are found.
const CLASSICAL_PRONUNCIATIONS: Record<string, string> = {
  "会稽": "kuài jī",
  "单于": "chán yú",
  "可汗": "kè hán",
  "龟兹": "qiū cí",
  "乐府": "yuè fǔ",
  "少长咸集": "shào zhǎng xián jí",
  "趣舍万殊": "qǔ shě wàn shū",
  "时运不齐": "shí yùn bú jì",
  "時運不齊": "shí yùn bú jì",
  "访风景于崇阿": "fǎng fēng jǐng yú chóng ē",
  "訪風景於崇阿": "fǎng fēng jǐng yú chóng ē",
  "十旬休假": "shí xún xiū xiá",
  "邺水朱华": "yè shuǐ zhū huā",
  "鄴水朱華": "yè shuǐ zhū huā",
  "吴会": "wú kuài",
  "吳會": "wú kuài",
};

customPinyin(CLASSICAL_PRONUNCIATIONS);

export function buildArticlePinyinData(article: {
  title: string;
  author: string;
  body: string;
}): ArticlePinyinData {
  const titleMap = buildPinyinMap(article.title);
  const authorMap = buildPinyinMap(article.author);
  const bodyMap = buildPinyinMap(article.body);

  return {
    version: ARTICLE_PINYIN_VERSION,
    title: article.title,
    author: article.author,
    body: article.body,
    titleMap,
    authorMap,
    bodyMap,
    pinyinMap: [...titleMap, ...authorMap, ...bodyMap],
  };
}

export function isCurrentArticlePinyinData(
  value: unknown,
  article: { title: string; author: string; body: string }
): value is ArticlePinyinData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ArticlePinyinData>;
  return data.version === ARTICLE_PINYIN_VERSION
    && data.title === article.title
    && data.author === article.author
    && data.body === article.body
    && Array.isArray(data.titleMap)
    && Array.isArray(data.authorMap)
    && Array.isArray(data.bodyMap);
}

export function applyContextPinyinCorrections(
  data: ArticlePinyinData,
  corrections: ContextPinyinCorrection[]
): { data: ArticlePinyinData; applied: AppliedPinyinCorrection[]; skipped: string[] } {
  const maps = {
    title: [...data.titleMap],
    author: [...data.authorMap],
    body: [...data.bodyMap],
  };
  const texts = { title: data.title, author: data.author, body: data.body };
  const applied: AppliedPinyinCorrection[] = [];
  const skipped: string[] = [];

  for (const correction of corrections) {
    const phraseChars = Array.from(correction.text);
    const start = findOccurrenceStart(texts[correction.field], correction.text, correction.occurrence);
    if (correction.confidence < 0.7) {
      skipped.push(`${correction.text}：置信度不足`);
      continue;
    }
    if (start < 0 || phraseChars.length === 0) {
      skipped.push(`${correction.text}：原文位置无效`);
      continue;
    }
    if (phraseChars.length !== correction.pinyin.length) {
      skipped.push(`${correction.text}：字音数量不匹配`);
      continue;
    }

    phraseChars.forEach((char, index) => {
      maps[correction.field][start + index] = {
        char,
        pinyin: correction.pinyin[index] || "",
      };
    });
    applied.push({ ...correction, start });
  }

  return {
    data: {
      ...data,
      titleMap: maps.title,
      authorMap: maps.author,
      bodyMap: maps.body,
      pinyinMap: [...maps.title, ...maps.author, ...maps.body],
    },
    applied,
    skipped,
  };
}

function buildPinyinMap(text: string): PinyinMapItem[] {
  const chars = Array.from(text);
  const pronunciations = pinyin(text, {
    toneType: "symbol",
    type: "array",
  });

  return chars.map((char, index) => ({
    char,
    pinyin: /[\p{P}\p{S}\s]/u.test(char) ? "" : pronunciations[index] || "",
  }));
}

function findOccurrenceStart(text: string, phrase: string, occurrence: number): number {
  const chars = Array.from(text);
  const phraseChars = Array.from(phrase);
  const targetOccurrence = Math.max(1, occurrence);
  let found = 0;

  for (let index = 0; index <= chars.length - phraseChars.length; index += 1) {
    if (phraseChars.every((char, phraseIndex) => chars[index + phraseIndex] === char)) {
      found += 1;
      if (found === targetOccurrence) return index;
    }
  }

  return -1;
}
