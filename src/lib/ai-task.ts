import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLlmDetailed } from "@/lib/llm-service";
import { resolveLlmOptionsForTask } from "@/lib/ai-provider-policy";

interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AiTaskOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  maxProviders?: number;
  promptVersion: string;
}

export interface AiTaskResult<T> {
  data: T;
  rawOutput: string;
  logId: string | null;
  providerName: string;
  providerModel: string;
  durationMs: number;
}

export interface AiTextTaskResult {
  text: string;
  rawOutput: string;
  logId: string | null;
  providerName: string;
  providerModel: string;
  durationMs: number;
}

export async function runAiTask<T>(
  taskName: string,
  messages: AiMessage[],
  schema: z.ZodType<T>,
  options: AiTaskOptions
): Promise<AiTaskResult<T>> {
  const startedAt = Date.now();
  let providerName: string | undefined;
  let providerModel: string | undefined;
  let rawOutput = "";

  try {
    const llmResult = await callLlmDetailed(messages, resolveLlmOptionsForTask(taskName, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      maxProviders: options.maxProviders,
    }));
    rawOutput = llmResult.content;
    providerName = llmResult.providerName;
    providerModel = llmResult.providerModel;

    const parsed = parseJsonObject(rawOutput);
    const data = schema.parse(parsed);
    const logId = await writeAiTaskLog({
      taskName,
      promptVersion: options.promptVersion,
      providerName,
      providerModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      durationMs: llmResult.durationMs,
      success: true,
      rawOutputPreview: preview(rawOutput),
    });

    return {
      data,
      rawOutput,
      logId,
      providerName,
      providerModel,
      durationMs: llmResult.durationMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeAiTaskLog({
      taskName,
      promptVersion: options.promptVersion,
      providerName,
      providerModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      durationMs: Date.now() - startedAt,
      success: false,
      error: message,
      rawOutputPreview: rawOutput ? preview(rawOutput) : undefined,
    });
    throw error;
  }
}

/** 非结构化文本任务（创作、润色等），仍写入 AiTaskLog 便于观测 */
export async function runAiTextTask(
  taskName: string,
  messages: AiMessage[],
  options: AiTaskOptions
): Promise<AiTextTaskResult> {
  const startedAt = Date.now();
  let providerName: string | undefined;
  let providerModel: string | undefined;
  let rawOutput = "";

  try {
    const llmResult = await callLlmDetailed(messages, resolveLlmOptionsForTask(taskName, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      maxProviders: options.maxProviders,
    }));
    rawOutput = llmResult.content;
    providerName = llmResult.providerName;
    providerModel = llmResult.providerModel;

    const logId = await writeAiTaskLog({
      taskName,
      promptVersion: options.promptVersion,
      providerName,
      providerModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      durationMs: llmResult.durationMs,
      success: true,
      rawOutputPreview: preview(rawOutput),
    });

    return {
      text: rawOutput,
      rawOutput,
      logId,
      providerName,
      providerModel,
      durationMs: llmResult.durationMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeAiTaskLog({
      taskName,
      promptVersion: options.promptVersion,
      providerName,
      providerModel,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      durationMs: Date.now() - startedAt,
      success: false,
      error: message,
      rawOutputPreview: rawOutput ? preview(rawOutput) : undefined,
    });
    throw error;
  }
}

export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("AI 返回内容不是有效 JSON");
  }
}

export async function getAiTaskStats() {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const logs = await prisma.aiTaskLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const groups = new Map<string, {
    taskName: string;
    total: number;
    success: number;
    totalDuration: number;
    lastRunAt: string | null;
    lastError: string | null;
  }>();

  for (const log of logs) {
    const current = groups.get(log.taskName) || {
      taskName: log.taskName,
      total: 0,
      success: 0,
      totalDuration: 0,
      lastRunAt: null,
      lastError: null,
    };
    current.total++;
    if (log.success) current.success++;
    current.totalDuration += log.durationMs || 0;
    if (!current.lastRunAt) current.lastRunAt = log.createdAt.toISOString();
    if (!log.success && !current.lastError) current.lastError = log.error || "未知错误";
    groups.set(log.taskName, current);
  }

  return Array.from(groups.values()).map((item) => ({
    taskName: item.taskName,
    total: item.total,
    success: item.success,
    successRate: item.total > 0 ? Math.round((item.success / item.total) * 100) : 0,
    avgDurationMs: item.total > 0 ? Math.round(item.totalDuration / item.total) : 0,
    lastRunAt: item.lastRunAt,
    lastError: item.lastError,
  }));
}

async function writeAiTaskLog(data: {
  taskName: string;
  promptVersion: string;
  providerName?: string;
  providerModel?: string;
  temperature?: number;
  maxTokens?: number;
  durationMs?: number;
  success: boolean;
  error?: string;
  rawOutputPreview?: string;
}) {
  try {
    const log = await prisma.aiTaskLog.create({
      data: {
        taskName: data.taskName,
        promptVersion: data.promptVersion,
        providerName: data.providerName,
        providerModel: data.providerModel,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        durationMs: data.durationMs,
        success: data.success,
        error: data.error,
        rawOutputPreview: data.rawOutputPreview,
      },
    });
    return log.id;
  } catch (error) {
    console.warn("[ai-task] failed to write task log", error);
    return null;
  }
}

function preview(raw: string) {
  return raw.replace(/\s+/g, " ").slice(0, 1000);
}
