import { NextRequest, NextResponse } from "next/server";
import { generateUniqueSlug } from "@/lib/article-slug";
import { createArticleWithTags } from "@/lib/tag-service";
import { logAdminAction } from "@/lib/admin-log";
import { callLlmDetailed } from "@/lib/llm-service";
import { JIGU_IMPORT_PROMPT_VERSION } from "@/lib/prompts";

interface SourceCandidate {
  id: string;
  title: string;
  url: string;
  source: "wikisource" | "gushiwen" | "shicimingju" | "guoxue";
  excerpt: string;
  body: string;
  confidence: number;
  script: "zh-Hans" | "source-original";
  label: string;
}

export async function POST(request: NextRequest) {
  try {
    const { title, sourceCandidate } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: "请输入标题" }, { status: 400 });

    const trimmedTitle = title.trim();
    const selectedSource = await normalizeSource(sourceCandidate);
    if (!selectedSource) {
      const candidates = await searchSources(trimmedTitle);
      return NextResponse.json({
        needSource: true, title: trimmedTitle, candidates,
        message: candidates.length > 0 ? "请确认原文来源后导入" : "未检索到来源",
      });
    }

    const article = await createArticleWithTags({
      data: {
        slug: await generateUniqueSlug(trimmedTitle),
        title: trimmedTitle, author: "佚名", source: "jigu",
        type: inferType(selectedSource.body, trimmedTitle),
        body: selectedSource.body, status: "review",
        tagList: JSON.stringify(["辑古台", "待AI增强"]),
        rawContent: JSON.stringify({ sourceCandidate: selectedSource, promptVersion: JIGU_IMPORT_PROMPT_VERSION, aiStatus: "pending" }),
        confidence: Math.min(0.95, selectedSource.confidence || 0.7),
      },
    }, ["辑古台", "待AI增强"]);

    await logAdminAction({
      action: "jigu.source.import", entityType: "article", entityId: article.id,
      summary: `辑古台导入「${article.title}」待校`,
      metadata: { title: trimmedTitle, sourceUrl: selectedSource.url },
    });

    return NextResponse.json({
      id: article.id, slug: article.slug, title: article.title,
      author: article.author, body: article.body.slice(0, 500),
      annotations: [], tags: ["辑古台", "待AI增强"], status: "review",
      confidence: selectedSource.confidence, sourceCandidate: selectedSource,
      aiWarning: "来源原文已导入待校，请在集校编辑确认后执行 AI 补全。",
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "创建失败" }, { status: 500 });
  }
}

// ===================================================
// 来源检索：维基文库优先，LLM 兜底
// ===================================================

async function searchSources(title: string): Promise<SourceCandidate[]> {
  const llm = await llmExtract(title).catch(() => []);
  if (llm.length > 0) return llm;
  return searchWikisource(title).catch(() => []);
}

// ---- 维基文库 ----
async function searchWikisource(title: string): Promise<SourceCandidate[]> {
  const u = new URL("https://zh.wikisource.org/w/api.php");
  u.searchParams.set("action", "opensearch"); u.searchParams.set("search", title);
  u.searchParams.set("limit", "4"); u.searchParams.set("format", "json"); u.searchParams.set("origin", "*");

  const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  const titles: string[] = data?.[1] || [];
  const urls: string[] = data?.[3] || [];
  const results: SourceCandidate[] = [];

  for (let i = 0; i < titles.length; i++) {
    const body = await wikiExtract(titles[i]);
    if (!body || body.length < 20) continue;
    results.push({
      id: `wiki-${i}`, title: titles[i],
      url: `${urls[i] || `https://zh.wikisource.org/wiki/${encodeURIComponent(titles[i])}`}?variant=zh-hans`,
      source: "wikisource", label: "维基文库",
      excerpt: body.slice(0, 240), body: cleanWiki(body),
      confidence: matchConf(title, titles[i], 0.78), script: "zh-Hans",
    });
  }
  return results;
}

async function wikiExtract(t: string) {
  const u = new URL("https://zh.wikisource.org/w/api.php");
  u.searchParams.set("action", "query"); u.searchParams.set("prop", "extracts");
  u.searchParams.set("explaintext", "1"); u.searchParams.set("redirects", "1");
  u.searchParams.set("titles", t); u.searchParams.set("format", "json"); u.searchParams.set("origin", "*");
  const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return "";
  const data = await res.json();
  const page = Object.values(data?.query?.pages || {})[0] as { extract?: string } | undefined;
  return page?.extract || "";
}

function cleanWiki(b: string) {
  const i = b.indexOf("== 横排 ==");
  const c = i >= 0 ? b.slice(i + "== 横排 ==".length) : b;
  return c.replace(/^==\s*(竖排|横排)\s*==\s*$/gm, "").replace(/\n{3,}/g, "\n\n").replace(/^\s*本作品.*$/gm, "").trim();
}

// ---- LLM 提取 ----
function llmExtract(title: string): Promise<SourceCandidate[]> {
  return callLlmDetailed(
    [
      { role: "system", content: "你是古典文献专家，请凭训练数据知识返回经典篇目的完整原文。" },
      { role: "user", content: `篇目：${title}\n\n返回JSON：{"title":"","author":"","body":"完整原文"}` },
    ],
    { temperature: 0.3, maxTokens: 8192, timeoutMs: 90000 }
  ).then(result => {
    const m = result.content.match(/\{[\s\S]*\}/);
    if (!m) return [];
    const d = JSON.parse(m[0]);
    if (!d.body || d.body.length < 20) return [];
    return [{
      id: "llm", title: d.title || title, url: "",
      source: "guoxue" as const, label: "AI 知识库",
      excerpt: d.body.slice(0, 240), body: d.body,
      confidence: 0.7, script: "zh-Hans" as const,
    }];
  }).catch(() => []);
}

// ---- 辅助 ----
function matchConf(q: string, f: string, base: number): number {
  const a = q.replace(/[·\s]/g, ""), b = f.replace(/[·\s]/g, "");
  if (a === b) return Math.min(0.95, base + 0.15);
  if (b.includes(a) || a.includes(b)) return Math.min(0.9, base + 0.1);
  return base;
}

async function normalizeSource(input: unknown): Promise<SourceCandidate | null> {
  if (!input || typeof input !== "object") return null;
  const d = input as Partial<SourceCandidate>;
  if (!d.title || !d.body) return null;
  const alt = d.url ? await wikiExtract(d.title).catch(() => "") : "";
  const body = cleanWiki(alt || d.body);
  const url = d.url ? (() => { try { return new URL(d.url).toString(); } catch { return ""; } })() : "";
  return {
    id: d.id || "manual", title: d.title,
    url,
    source: d.source || "wikisource", label: d.label || "用户指定",
    excerpt: body.slice(0, 240), body,
    confidence: d.confidence || 0.7,
    script: alt ? "zh-Hans" : "source-original",
  };
}

function inferType(body: string, title: string): string {
  if (title.includes("词") || title.includes("令")) return "词";
  if (title.includes("赋") || title.includes("序") || title.includes("论")) return "文";
  if (body.length > 500) return "文";
  return "诗";
}
