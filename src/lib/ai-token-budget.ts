/** 按输入规模估算 maxTokens，避免短诗也跑满 16k 输出 */

export type TokenBudgetKind =
  | "json-unified"
  | "json-review"
  | "json-parse"
  | "json-jigu"
  | "json-assist"
  | "text-write"
  | "text";

const BUDGET: Record<
  TokenBudgetKind,
  { base: number; perChar: number; min: number; max: number }
> = {
  "json-unified": { base: 1800, perChar: 2.2, min: 2048, max: 8192 },
  "json-review": { base: 900, perChar: 1.2, min: 1200, max: 2400 },
  "json-parse": { base: 800, perChar: 2.0, min: 1024, max: 6144 },
  "json-jigu": { base: 600, perChar: 1.8, min: 1024, max: 6144 },
  "json-assist": { base: 1200, perChar: 2.0, min: 2048, max: 8192 },
  "text-write": { base: 400, perChar: 1.5, min: 512, max: 4096 },
  text: { base: 256, perChar: 1.0, min: 256, max: 2048 },
};

export function estimateMaxTokens(inputLength: number, kind: TokenBudgetKind): number {
  const cfg = BUDGET[kind];
  const chars = Math.max(0, inputLength);
  let estimated = Math.ceil(cfg.base + chars * cfg.perChar);

  if (chars < 400 && (kind === "json-parse" || kind === "json-jigu" || kind === "json-assist")) {
    estimated = Math.min(estimated, Math.max(cfg.min, Math.ceil(640 + chars * 1.4)));
  }
  if (chars < 200) {
    estimated = Math.min(estimated, 2048);
  }

  return Math.min(cfg.max, Math.max(cfg.min, estimated));
}

/** 多段文本合并估算 */
export function estimateMaxTokensFromParts(kind: TokenBudgetKind, ...parts: Array<string | null | undefined>): number {
  const total = parts.reduce((sum, part) => sum + (part?.length ?? 0), 0);
  return estimateMaxTokens(total, kind);
}
