import { prisma } from "@/lib/prisma";

interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCallOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  maxProviders?: number;
  /** 优先匹配的 model 名称模式，用于按任务层级调度 Provider */
  preferModelPatterns?: RegExp[];
}

const MAX_RETRIES = 2;

interface ProviderConfig {
  name: string;
  model: string;
  apiKey: string | null;
  label?: string;
}

export interface LlmCallResult {
  content: string;
  providerName: string;
  providerLabel: string;
  providerModel: string;
  durationMs: number;
}

// SSRF Protection: Allow only known LLM provider domains
const ALLOWED_DOMAINS = [
  "api.deepseek.com",
  "open.bigmodel.cn",
  "api.minimax.chat",
  "api.minimax.io",
  "api.minimaxi.com",
  "openrouter.ai",
  "ark.cn-beijing.volces.com",
  "ark.cn-shanghai.volces.com",
  "api.zhipuai.cn",
  "openai.com",
  "api.mistral.ai",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
] as const;

function validateBaseUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only HTTP/HTTPS protocols allowed");
    }
    const isAllowed = ALLOWED_DOMAINS.some((domain) =>
      parsed.hostname.endsWith(domain)
    );
    if (!isAllowed) {
      throw new Error(
        `Provider URL not allowed: ${parsed.hostname}. Must be one of: ${ALLOWED_DOMAINS.join(", ")}`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("not allowed")) {
      throw err;
    }
    throw new Error(`Invalid URL: ${url}`);
  }
}

export async function callLlm(
  messages: LlmMessage[],
  options: LlmCallOptions = {}
): Promise<string> {
  const result = await callLlmDetailed(messages, options);
  return result.content;
}

export async function callLlmDetailed(
  messages: LlmMessage[],
  options: LlmCallOptions = {}
): Promise<LlmCallResult> {
  const {
    temperature = 0.7,
    maxTokens = 4096,
    timeoutMs = 60000,
    maxRetries = MAX_RETRIES,
    maxProviders,
    preferModelPatterns,
  } = options;

  const availableProviders = await getSortedProviders({ maxProviders, preferModelPatterns });
  const providers = availableProviders;

  if (providers.length === 0) {
    throw new Error("未配置可用的 LLM Provider，请在 API 配置中启用至少一个");
  }

  const failureReasons: string[] = [];

  for (const provider of providers) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startedAt = Date.now();
        const apiKey = resolveApiKey(provider);
        if (!apiKey) {
          console.warn(`[LLM] Provider ${provider.label} 未配置 API Key，跳过`);
          failureReasons.push(`${provider.label} 未配置 API Key`);
          break;
        }

        // SSRF Protection: Validate provider URL before use
        validateBaseUrl(provider.baseUrl);

        const baseUrl = provider.baseUrl.replace(/\/+$/, "");
        const url = `${baseUrl}/chat/completions`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(buildRequestBody(provider, messages, temperature, maxTokens)),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          const responseMessage = `${provider.label} 返回 ${res.status}${errText ? `：${errText.slice(0, 80)}` : ""}`;
          console.warn(
            `[LLM] ${provider.label} 返回 ${res.status} (attempt ${attempt + 1}): ${errText.slice(0, 200)}`
          );
          if (attempt === maxRetries || (res.status !== 429 && res.status < 500)) {
            failureReasons.push(responseMessage);
          }
          if (res.status === 429 || res.status >= 500) continue; // retry
          break; // don't retry 4xx errors (except 429)
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return {
            content,
            providerName: provider.name,
            providerLabel: provider.label,
            providerModel: provider.model,
            durationMs: Date.now() - startedAt,
          };
        }

        console.warn(`[LLM] ${provider.label} 返回空内容`);
        failureReasons.push(`${provider.label} 返回空内容`);
        break;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.name === "AbortError" || error.name === "TimeoutError") {
          console.warn(`[LLM] ${provider.label} 超时 (attempt ${attempt + 1})`);
          if (attempt === maxRetries) failureReasons.push(`${provider.label} 超时`);
        } else {
          // Re-throw SSRF/validation errors immediately
          if (error.message.includes("not allowed") || error.message.includes("Invalid URL")) {
            throw error;
          }
          console.warn(`[LLM] ${provider.label} 网络错误: ${error.message}`);
          if (attempt === maxRetries) failureReasons.push(`${provider.label} 网络错误：${error.message}`);
        }
        if (attempt < maxRetries) {
          await sleep(1000 * (attempt + 1));
        }
      }
    }
  }

  throw new Error(
    failureReasons.length > 0
      ? `所有 LLM Provider 均不可用（${failureReasons.join("；")}）`
      : "所有 LLM Provider 均不可用"
  );
}

function getEnvApiKey(providerName: string): string | undefined {
  if (providerName.startsWith("deepseek")) {
    return process.env.DEEPSEEK_API_KEY;
  }

  switch (providerName) {
    case "zhipu":
      return process.env.ZHIPU_API_KEY;
    case "volcengine":
      return process.env.VOLCENGINE_API_KEY;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
    case "minimax":
      return process.env.MINIMAX_API_KEY;
    case "gemini-2.5-flash":
    case "gemini-2.5-pro":
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    default:
      return process.env[`${providerName.toUpperCase()}_API_KEY`];
  }
}

function resolveApiKey(provider: ProviderConfig): string | undefined {
  return provider.apiKey || getEnvApiKey(provider.name);
}

function sortProvidersByPreference<T extends { model: string; priority: number }>(
  providers: T[],
  patterns?: RegExp[]
): T[] {
  if (!patterns || patterns.length === 0) return providers;

  return [...providers].sort((left, right) => {
    const leftScore = scoreModelMatch(left.model, patterns);
    const rightScore = scoreModelMatch(right.model, patterns);
    if (leftScore !== rightScore) return rightScore - leftScore;
    return left.priority - right.priority;
  });
}

function scoreModelMatch(model: string, patterns: RegExp[]): number {
  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].test(model)) return patterns.length - i;
  }
  return 0;
}

function buildRequestBody(
  provider: ProviderConfig,
  messages: LlmMessage[],
  temperature: number,
  maxTokens: number,
  stream = false
) {
  const body: {
    model: string;
    messages: LlmMessage[];
    temperature: number;
    max_tokens: number;
    stream?: boolean;
    thinking?: { type: "disabled" };
    reasoning_split?: boolean;
    reasoning_effort?: "none";
  } = {
    model: provider.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (stream) {
    body.stream = true;
  }

  if (provider.model === "deepseek-v4-pro" || provider.model === "deepseek-v4-flash") {
    // Current workflows consume a direct final response; keep V4 reasoning out of that budget.
    body.thinking = { type: "disabled" };
  }

  if (provider.model.startsWith("MiniMax-M2")) {
    // Separate model reasoning from final prose used in article workflows.
    body.reasoning_split = true;
  }

  if (isGeminiFlashModel(provider.model)) {
    // Workflows expect direct final text/JSON; disable Gemini 2.5 Flash thinking budget.
    body.reasoning_effort = "none";
  }

  return body;
}

async function getSortedProviders(options: LlmCallOptions) {
  const { maxProviders, preferModelPatterns } = options;
  const availableProviders = await getCachedEnabledProviders();
  const sortedProviders = sortProvidersByPreference(availableProviders, preferModelPatterns);
  return maxProviders === undefined
    ? sortedProviders
    : sortedProviders.slice(0, maxProviders);
}

const PROVIDER_CACHE_TTL_MS = 60_000;
let cachedProviders: Awaited<ReturnType<typeof prisma.llmProvider.findMany>> | null = null;
let cachedProvidersAt = 0;

async function getCachedEnabledProviders() {
  const now = Date.now();
  if (cachedProviders && now - cachedProvidersAt < PROVIDER_CACHE_TTL_MS) {
    return cachedProviders;
  }
  cachedProviders = await prisma.llmProvider.findMany({
    where: { enabled: true },
    orderBy: { priority: "asc" },
  });
  cachedProvidersAt = now;
  return cachedProviders;
}

export function invalidateLlmProviderCache() {
  cachedProviders = null;
  cachedProvidersAt = 0;
}

export interface LlmStreamHandlers {
  onToken: (token: string) => void;
}

/** 流式 LLM 调用：边生成边回调 token，适合交互写作 */
export async function callLlmStreamDetailed(
  messages: LlmMessage[],
  options: LlmCallOptions = {},
  handlers: LlmStreamHandlers
): Promise<LlmCallResult> {
  const {
    temperature = 0.7,
    maxTokens = 4096,
    timeoutMs = 120000,
    maxRetries = 1,
    maxProviders = 1,
    preferModelPatterns,
  } = options;

  const providers = await getSortedProviders({ maxProviders, preferModelPatterns });
  if (providers.length === 0) {
    throw new Error("未配置可用的 LLM Provider，请在 API 配置中启用至少一个");
  }

  const provider = providers[0];
  const startedAt = Date.now();
  const apiKey = resolveApiKey(provider);
  if (!apiKey) {
    throw new Error(`${provider.label} 未配置 API Key`);
  }

  validateBaseUrl(provider.baseUrl);
  const baseUrl = provider.baseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildRequestBody(provider, messages, temperature, maxTokens, true)),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        if (attempt < maxRetries && (res.status === 429 || res.status >= 500)) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw new Error(`${provider.label} 返回 ${res.status}${errText ? `：${errText.slice(0, 80)}` : ""}`);
      }

      if (!res.body) throw new Error(`${provider.label} 未返回流式响应`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const token = parsed.choices?.[0]?.delta?.content ?? "";
            if (token) {
              content += token;
              handlers.onToken(token);
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }

      if (!content.trim()) {
        throw new Error(`${provider.label} 流式返回空内容`);
      }

      return {
        content,
        providerName: provider.name,
        providerLabel: provider.label,
        providerModel: provider.model,
        durationMs: Date.now() - startedAt,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw new Error("流式 LLM 调用失败");
}

function isGeminiFlashModel(model: string): boolean {
  return /^gemini-[\d.]+-flash/i.test(model);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function testLlmConnection(providerId: string): Promise<{ success: boolean; message: string; latencyMs?: number; checkedAt: string }> {
  const checkedAt = new Date().toISOString();
  const provider = await prisma.llmProvider.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    return { success: false, message: "Provider 不存在", checkedAt };
  }

  const apiKey = resolveApiKey(provider);
  if (!apiKey) {
    return { success: false, message: "未配置 API Key", checkedAt };
  }

  try {
    validateBaseUrl(provider.baseUrl);

    const baseUrl = provider.baseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/chat/completions`;
    const startedAt = Date.now();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildRequestBody(
        provider,
        [{ role: "user", content: "Reply with OK only." }],
        provider.model.startsWith("MiniMax-M2") ? 1 : 0,
        provider.model.startsWith("MiniMax-M2") ? 256 : 32
      )),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        success: false,
        message: `连接失败 (${res.status}): ${errText.slice(0, 100)}`,
        latencyMs: Date.now() - startedAt,
        checkedAt,
      };
    }

    const data = await res.json();
    if (data.choices?.[0]?.message?.content) {
      return { success: true, message: "连接成功", latencyMs: Date.now() - startedAt, checkedAt };
    }

    if (provider.model.startsWith("MiniMax-M2") && data.choices?.[0]?.message?.reasoning_details) {
      return { success: true, message: "连接成功（已返回推理内容）", latencyMs: Date.now() - startedAt, checkedAt };
    }

    return { success: false, message: "返回内容格式异常", latencyMs: Date.now() - startedAt, checkedAt };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, message: `连接错误: ${error.message}`, checkedAt };
  }
}
