import { jsonrepair } from "jsonrepair";

function sanitizeLlmJson(text: string): string {
  return text
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function collectJsonCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function buildParseAttempts(raw: string): string[] {
  const attempts: string[] = [];

  for (const candidate of collectJsonCandidates(raw)) {
    attempts.push(candidate);
    attempts.push(sanitizeLlmJson(candidate));

    try {
      attempts.push(jsonrepair(candidate));
    } catch {
      // jsonrepair 无法修复时跳过
    }

    const sanitized = sanitizeLlmJson(candidate);
    try {
      attempts.push(jsonrepair(sanitized));
    } catch {
      // ignore
    }
  }

  return [...new Set(attempts)];
}

/** 解析 LLM 返回的 JSON，自动修复尾逗号、引号等问题 */
export function parseLlmJsonText(raw: string): unknown {
  for (const attempt of buildParseAttempts(raw)) {
    try {
      return JSON.parse(attempt);
    } catch {
      continue;
    }
  }

  throw new Error("AI 返回内容不是有效 JSON");
}
