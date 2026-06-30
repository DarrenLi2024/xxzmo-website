import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateLlmProviderCache } from "@/lib/llm-service";

const providers = [
  { name: "gemini-2.5-flash", label: "Google Gemini 2.5 Flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash", priority: 1, enabled: true },
  { name: "deepseek-v4-flash", label: "DeepSeek V4-Flash", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-flash", priority: 2, enabled: true },
  { name: "deepseek-v4-pro", label: "DeepSeek V4-Pro", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-pro", priority: 3, enabled: true },
  { name: "minimax", label: "MiniMax", baseUrl: "https://api.minimaxi.com/v1", model: "MiniMax-M2.7", priority: 4, enabled: true },
  { name: "zhipu", label: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-plus", priority: 5, enabled: false },
  { name: "volcengine", label: "火山引擎", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-pro-32k", priority: 6, enabled: false },
  { name: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "anthropic/claude-3.5-sonnet", priority: 7, enabled: false },
  { name: "gemini-2.5-pro", label: "Google Gemini 2.5 Pro", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-pro", priority: 8, enabled: false },
];

export async function POST() {
  try {
    for (const provider of providers) {
      await prisma.llmProvider.upsert({
        where: { name: provider.name },
        update: {
          label: provider.label,
          baseUrl: provider.baseUrl,
          model: provider.model,
          priority: provider.priority,
          enabled: provider.enabled,
        },
        create: provider,
      });
    }
    invalidateLlmProviderCache();
    return NextResponse.json({ success: true, message: `已初始化 ${providers.length} 个 Provider` });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
