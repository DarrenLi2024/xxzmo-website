import { createHash } from "crypto";

const SIMHASH_BITS = 64;

/** 归一化文本：去空白与常见标点，便于指纹比较 */
export function normalizeFingerprintText(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：,.!?;:'"「」『』（）()\[\]【】]/g, "")
    .toLowerCase();
}

function hashToken(token: string): bigint {
  const hex = createHash("sha256").update(token).digest("hex").slice(0, 16);
  return BigInt(`0x${hex}`);
}

/** 提取 3-gram 特征 */
function extractShingles(text: string, size = 3): string[] {
  if (text.length <= size) return [text];
  const shingles: string[] = [];
  for (let i = 0; i <= text.length - size; i++) {
    shingles.push(text.slice(i, i + size));
  }
  return shingles;
}

/** 64-bit SimHash，返回 16 位 hex */
export function computeSimhash(text: string): string {
  const normalized = normalizeFingerprintText(text);
  if (!normalized) return "0".repeat(16);

  const weights = new Array<number>(SIMHASH_BITS).fill(0);
  const uniqueShingles = [...new Set(extractShingles(normalized))];

  for (const shingle of uniqueShingles) {
    const hash = hashToken(shingle);
    for (let i = 0; i < SIMHASH_BITS; i++) {
      const bit = (hash >> BigInt(i)) & BigInt(1);
      weights[i] += bit === BigInt(1) ? 1 : -1;
    }
  }

  let simhash = BigInt(0);
  for (let i = 0; i < SIMHASH_BITS; i++) {
    if (weights[i] > 0) simhash |= BigInt(1) << BigInt(i);
  }

  return simhash.toString(16).padStart(16, "0");
}

export function simhashToBigInt(hex: string): bigint {
  return BigInt(`0x${hex.padStart(16, "0")}`);
}

export function hammingDistanceHex(a: string, b: string): number {
  const xor = simhashToBigInt(a) ^ simhashToBigInt(b);
  let count = 0;
  let value = xor;
  while (value > BigInt(0)) {
    count++;
    value &= value - BigInt(1);
  }
  return count;
}

/** SimHash 相似度 0-1 */
export function simhashSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const distance = hammingDistanceHex(a, b);
  return Math.max(0, 1 - distance / SIMHASH_BITS);
}

/** 指纹分桶前缀（前 16 bit），用于候选召回 */
export function fingerprintBucket(simhash: string): string {
  return simhash.slice(0, 4);
}

export function computeTitleKey(title: string): string {
  return normalizeFingerprintText(title).slice(0, 32);
}

export interface ArticleFingerprintInput {
  title: string;
  preface?: string | null;
  body: string;
  postscript?: string | null;
}

export function computeArticleFingerprint(article: ArticleFingerprintInput): {
  simhash: string;
  bucket: string;
  titleKey: string;
} {
  const comparable = `${article.title}${article.preface || ""}${article.body}${article.postscript || ""}`;
  const simhash = computeSimhash(comparable);
  return {
    simhash,
    bucket: fingerprintBucket(simhash),
    titleKey: computeTitleKey(article.title),
  };
}
