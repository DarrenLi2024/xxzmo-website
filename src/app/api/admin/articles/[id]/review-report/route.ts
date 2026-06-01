import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { articleReviewSchema } from "@/lib/ai-schemas";
import { ARTICLE_REVIEW_PROMPT_VERSION } from "@/lib/prompts";

interface ReviewIssue {
  category: string;
  severity: "low" | "medium" | "high";
  target: string;
  detail: string;
  suggestion: string;
  field?: ReviewField;
  original: string;
  replacement: string;
}

type ReviewField = "title" | "author" | "type" | "dateRaw" | "preface" | "body"
  | "postscript" | "notes" | "annotations" | "translation" | "appreciation";

interface ReviewReport {
  overall: "pass" | "review" | "risk";
  score: number;
  summary: string;
  issues: ReviewIssue[];
  strengths: string[];
  publishAdvice: string;
  generatedAt: string;
  source: {
    provider: "configured-llm";
    promptVersion: string;
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: { reviewReport: true },
  });

  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  if (!article.reviewReport) {
    return NextResponse.json({ success: false, message: "尚未生成校审报告" });
  }

  return NextResponse.json({ success: true, data: parseStoredReport(article.reviewReport) });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        source: true,
        type: true,
        status: true,
        dateRaw: true,
        preface: true,
        body: true,
        postscript: true,
        notes: true,
        annotations: true,
        translation: true,
        appreciation: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    const aiResult = await runAiTask(
      "article.review",
      [
        {
          role: "system",
          content: "你是一位谨严而有审美判断力的中文文学编辑，熟悉古典诗文、现代诗文、注释、译文与赏析校审。你只基于用户提供内容判断，不凭空补充事实。你只输出严格 JSON，不输出 Markdown。",
        },
        {
          role: "user",
          content: buildReviewPrompt(article),
        },
      ],
      articleReviewSchema,
      {
        promptVersion: ARTICLE_REVIEW_PROMPT_VERSION,
        temperature: 0.2,
        maxTokens: 2200,
      }
    );

    const report = normalizeReport(aiResult.data);
    const savedReport: ReviewReport = {
      ...report,
      generatedAt: new Date().toISOString(),
      source: {
        provider: "configured-llm",
        promptVersion: ARTICLE_REVIEW_PROMPT_VERSION,
      },
    };

    await prisma.article.update({
      where: { id },
      data: {
        reviewReport: JSON.stringify(savedReport),
        status: article.status === "published" ? "published" : "review",
      },
    });

    return NextResponse.json({ success: true, data: savedReport });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 校审失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildReviewPrompt(article: {
  title: string;
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
}) {
  return `请校审以下文章。重点检查：错字、断句、诗体换行、注释是否过度或失准、译文是否偏离原意、赏析是否空泛、格律或文体风险、事实与典故风险、发布前是否还需人工复核。

必须只返回如下 JSON 结构：
{
  "overall": "pass | review | risk",
  "score": 0-100,
  "summary": "不超过80字的总体判断",
  "issues": [
    {
      "category": "错字 | 断句 | 注释 | 译文 | 赏析 | 格律 | 事实 | 风格",
      "severity": "low | medium | high",
      "target": "问题所在的短语或字段",
      "detail": "问题说明",
      "suggestion": "修改建议",
      "field": "title | author | type | dateRaw | preface | body | postscript | notes | annotations | translation | appreciation",
      "original": "可在对应字段中精确匹配的原片段",
      "replacement": "用于替换 original 的新片段"
    }
  ],
  "strengths": ["值得保留的优点"],
  "publishAdvice": "发布前建议"
}

可直接修改的问题必须填写 field、original、replacement，且 original 必须逐字出现在对应字段中；仅需人工判断或缺少证据的问题请省略 field，并将 original、replacement 留空。

【元信息】
标题：${article.title}
作者：${article.author}
来源：${article.source}
类型：${article.type}
日期/朝代：${article.dateRaw || "未填"}

【序】
${article.preface || "无"}

【正文】
${article.body}

【跋】
${article.postscript || "无"}

【备注】
${article.notes || "无"}

【注释 JSON】
${article.annotations || "无"}

【译文】
${article.translation || "无"}

【赏析】
${article.appreciation || "无"}`;
}

function normalizeReport(raw: unknown): Omit<ReviewReport, "generatedAt" | "source"> {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const overall = data.overall === "pass" || data.overall === "risk" ? data.overall : "review";
  const score = typeof data.score === "number" && Number.isFinite(data.score)
    ? Math.max(0, Math.min(100, Math.round(data.score)))
    : 70;
  const issues = Array.isArray(data.issues)
    ? data.issues.map(normalizeIssue).filter((item): item is ReviewIssue => item !== null).slice(0, 12)
    : [];
  const strengths = Array.isArray(data.strengths)
    ? data.strengths.filter((item): item is string => typeof item === "string").slice(0, 6)
    : [];

  return {
    overall,
    score,
    summary: typeof data.summary === "string" ? data.summary : "AI 已完成基础校审，请人工复核重点问题。",
    issues,
    strengths,
    publishAdvice: typeof data.publishAdvice === "string" ? data.publishAdvice : "建议人工通读后再发布。",
  };
}

function normalizeIssue(raw: unknown): ReviewIssue | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const severity = data.severity === "high" || data.severity === "low" ? data.severity : "medium";
  const field = isReviewField(data.field) ? data.field : undefined;

  return {
    category: typeof data.category === "string" ? data.category : "校审",
    severity,
    target: typeof data.target === "string" ? data.target : "",
    detail: typeof data.detail === "string" ? data.detail : "",
    suggestion: typeof data.suggestion === "string" ? data.suggestion : "",
    field,
    original: typeof data.original === "string" ? data.original : "",
    replacement: typeof data.replacement === "string" ? data.replacement : "",
  };
}

function isReviewField(value: unknown): value is ReviewField {
  return typeof value === "string" && [
    "title", "author", "type", "dateRaw", "preface", "body",
    "postscript", "notes", "annotations", "translation", "appreciation",
  ].includes(value);
}

function parseStoredReport(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return {
      overall: "review",
      score: 0,
      summary: "校审报告数据损坏，请重新生成。",
      issues: [],
      strengths: [],
      publishAdvice: "请重新生成 AI 校审报告。",
      generatedAt: null,
      source: null,
    };
  }
}
