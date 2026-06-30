import { NextResponse } from "next/server";
import { runAiTask } from "@/lib/ai-task";
import { articleAssistSchema } from "@/lib/ai-schemas";
import { ARTICLE_ASSIST_PROMPT_VERSION, buildArticleAssistMessages } from "@/lib/prompts";
import { estimateMaxTokensFromParts } from "@/lib/ai-token-budget";

export async function POST(request: Request) {
  try {
    const { title, author, body, dateRaw, preface, postscript, notes, sourceEvidence } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "请提供标题和正文" }, { status: 400 });
    }

    const result = await runAiTask(
      "article.assist",
      buildArticleAssistMessages({ title, author, body, dateRaw, preface, postscript, notes, sourceEvidence }),
      articleAssistSchema,
      {
        promptVersion: ARTICLE_ASSIST_PROMPT_VERSION,
        temperature: 0.3,
        maxTokens: estimateMaxTokensFromParts("json-assist", title, body, preface, postscript, notes),
      }
    );

    return NextResponse.json({
      ...result.data,
      aiMeta: {
        taskName: "article.assist",
        promptVersion: ARTICLE_ASSIST_PROMPT_VERSION,
        logId: result.logId,
        providerName: result.providerName,
        providerModel: result.providerModel,
        durationMs: result.durationMs,
      },
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 辅助生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
