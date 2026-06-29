import { NextRequest, NextResponse } from "next/server";
import { runAiTextTask, runAiTextTaskStream } from "@/lib/ai-task";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-log";
import { estimateMaxTokensFromParts } from "@/lib/ai-token-budget";
import { createSseStream, sseResponse } from "@/lib/sse-server";

const XIANYIN_WRITE_PROMPT_VERSION = "xianyin-write-v1";

const WRITE_MODES = [
  { value: "generate", label: "AI 生成", desc: "根据想法自动生成完整诗文" },
  { value: "rewrite", label: "改写", desc: "用不同风格重写" },
  { value: "expand", label: "扩写", desc: "将短句扩展为完整篇章" },
  { value: "continue", label: "续写", desc: "根据开头续写后续内容" },
  { value: "polish", label: "润色", desc: "优化用词、韵律和意境" },
  { value: "tuijiao", label: "推敲", desc: "逐字推敲，给出替换建议" },
] as const;

const TYPE_OPTIONS = ["诗", "词", "文", "赋", "随笔", "日记", "对联"] as const;

const SYSTEM_PROMPTS: Record<string, string> = {
  generate: `你是一位古典诗文创作大师，精通诗词歌赋。用户会提供一个想法或主题，请你创作一篇完整的诗文。

要求：
1. 根据用户的想法，创作一篇完整的、符合古典格律的诗文
2. 如果是诗：注意平仄、押韵、对仗
3. 如果是词：选择合适的词牌，遵循词牌格律
4. 如果是文/赋：讲究骈俪对仗、辞藻典雅
5. 如果是随笔/日记：文白相间，自然流畅
6. 请输出纯诗文内容，不要加解释说明`,

  rewrite: `你是一位古典诗文创作大师。用户会提供一篇已有的诗文，请你用不同的风格或体裁进行改写。

要求：
1. 保持原意的核心，但更换表达方式
2. 如果是改写体裁（如诗改词），请遵循目标体裁的格律要求
3. 用词要典雅，意境要深远
4. 请输出纯诗文内容，不要加解释说明`,

  expand: `你是一位古典诗文创作大师。用户会提供一个短句或片段，请将其扩展为一篇完整的诗文。

要求：
1. 从短句中提取核心意象和情感
2. 围绕核心意象展开丰富的描写和抒情
3. 补充起承转合的完整结构
4. 遵循目标体裁的格律要求
5. 请输出纯诗文内容，不要加解释说明`,

  continue: `你是一位古典诗文创作大师。用户会提供一个开头，请你续写出后续内容。

要求：
1. 仔细分析开头的风格、韵律和意境
2. 续写要与开头保持风格一致
3. 延续原有的韵律和格式
4. 完成一个完整的结尾
5. 需要包含完整的上下文，先输出用户的原文，再衔接续写内容
6. 请输出纯诗文内容，不要加解释说明`,

  polish: `你是一位古典诗文创作大师。用户会提供一篇诗文，请你在不改变原意的前提下进行润色优化。

要求：
1. 优化用词，使语言更加典雅精炼
2. 调整韵律，使平仄更和谐
3. 深化意境，让意象更丰富
4. 修正不通顺或不合理之处
5. 保持原作的风格和情感基调
6. 请输出润色后的纯诗文内容，不要加解释说明`,

  tuijiao: `你是一位古典诗文推敲大师，精通诗词格律和用字技巧。用户会提供一篇诗文，请你对每个值得推敲的字词给出多个替换方案。

要求：
1. 逐句分析，标识出可以推敲的字词
2. 对每个可推敲的字词，给出 2-3 个替换方案
3. 每个方案注明优劣（如：更雅、更切意、更合律、更有力度等）
4. 最后给出综合推荐版本

输出格式：

【原文】
{原文内容}

【逐字推敲】
"XXX"句 — "某"字：
  · 换"X" — 优点：XXX，缺点：XXX
  · 换"Y" — 优点：XXX
  · 换"Z" — 优点：XXX
  推荐：Z

"XXX"句 — "某"字：
  ...（继续）

【推荐版本】
{综合最佳替换后的全文}

请用中文输出，保持格式清晰。`,
};

interface WriteRequest {
  mode: string;
  type: string;
  input: string;
  styleHint?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WriteRequest = await request.json();
    const { mode, type, input, styleHint } = body;
    const stream = request.nextUrl.searchParams.get("stream") === "1";

    if (!input?.trim()) {
      return NextResponse.json({ error: "请输入想法或诗文内容" }, { status: 400 });
    }

    if (!WRITE_MODES.find(m => m.value === mode)) {
      return NextResponse.json({ error: "请选择有效的创作模式" }, { status: 400 });
    }

    if (!TYPE_OPTIONS.includes(type as typeof TYPE_OPTIONS[number])) {
      return NextResponse.json({ error: "请选择有效的体裁" }, { status: 400 });
    }

    const providers = await prisma.llmProvider.findMany({
      where: { enabled: true },
      select: { id: true },
    });

    if (providers.length === 0) {
      return NextResponse.json({ error: "未配置可用的 LLM Provider" }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.generate;

    const styleNote = styleHint?.trim()
      ? `\n\n风格偏好：${styleHint}`
      : "";

    const userMessage = `体裁：${type}\n\n${input}${styleNote}\n\n请开始创作。`;
    const taskName = `xianyin.write.${mode}`;
    const maxTokens = estimateMaxTokensFromParts("text-write", input, styleHint);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];
    const taskOptions = {
      promptVersion: XIANYIN_WRITE_PROMPT_VERSION,
      temperature: 0.85,
      maxTokens,
      timeoutMs: 90000,
    };

    if (stream) {
      const sse = createSseStream(async (send) => {
        const result = await runAiTextTaskStream(
          taskName,
          messages,
          taskOptions,
          (token) => send({ type: "token", token })
        );

        const output = extractPoemContent(result.text, mode === "continue");

        await logAdminAction({
          action: "xianyin.ai-write",
          entityType: "xianyin",
          summary: `AI ${WRITE_MODES.find(m => m.value === mode)?.label || mode} - ${type}`,
          metadata: {
            mode,
            type,
            inputLength: input.length,
            outputLength: output.length,
            provider: result.providerName,
            model: result.providerModel,
            durationMs: result.durationMs,
            logId: result.logId,
            stream: true,
          },
        });

        send({
          type: "meta",
          output,
          mode,
          articleType: type,
          provider: result.providerName,
          model: result.providerModel,
          durationMs: result.durationMs,
          logId: result.logId,
        });
      });

      return sseResponse(sse);
    }

    const result = await runAiTextTask(
      taskName,
      messages,
      taskOptions
    );

    const output = extractPoemContent(result.text, mode === "continue");

    await logAdminAction({
      action: "xianyin.ai-write",
      entityType: "xianyin",
      summary: `AI ${WRITE_MODES.find(m => m.value === mode)?.label || mode} - ${type}`,
      metadata: {
        mode,
        type,
        inputLength: input.length,
        outputLength: output.length,
        provider: result.providerName,
        model: result.providerModel,
        durationMs: result.durationMs,
        logId: result.logId,
      },
    });

    return NextResponse.json({
      success: true,
      output,
      mode,
      type,
      provider: result.providerName,
      model: result.providerModel,
      durationMs: result.durationMs,
      logId: result.logId,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 创作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractPoemContent(raw: string, includeOriginal = false): string {
  let text = raw.trim();

  // Remove markdown code blocks
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/```/g, "");

  // Remove common AI prefix/suffix chatter
  text = text.replace(/^(好的|这是一首|以下是为您|根据您的|我来).*?[：:]\s*/g, "");
  text = text.replace(/^[""「『]/g, "").replace(/[""」』]$/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export async function GET() {
  return NextResponse.json({
    modes: WRITE_MODES.map(m => ({ value: m.value, label: m.label, desc: m.desc })),
    types: TYPE_OPTIONS,
  });
}
