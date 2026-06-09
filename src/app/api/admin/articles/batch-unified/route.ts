import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runUnifiedCalibration } from "@/lib/unified-calibration";

/**
 * 批量 Unified AI 辅助 + 拼音校准
 * 
 * POST body: { articleIds: string[], concurrency?: number, source?: string }
 * 
 * 并发池模式：默认 5 并发，可通过 concurrency 参数调节。
 * 200 篇文章 5 并发约 3-6 分钟完成（vs 原串行 60 分钟）。
 */
export async function POST(request: NextRequest) {
  try {
    const { articleIds, concurrency = 5, source } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章ID列表" }, { status: 400 });
    }

    const providerCount = await prisma.llmProvider.count({ where: { enabled: true } });
    if (providerCount === 0) {
      return NextResponse.json({ error: "未配置可用的 LLM Provider" }, { status: 400 });
    }

    const MAX_CONCURRENCY = Math.min(concurrency, 10);
    const total = articleIds.length;

    const results = {
      total,
      success: 0,
      failed: 0,
      skipped: 0,
      pinyinCorrections: 0,
      pinyinUncertain: 0,
      startedAt: new Date().toISOString(),
      completedAt: null as string | null,
      durationMs: 0,
      items: [] as Array<{
        articleId: string;
        title?: string;
        status: "success" | "failed" | "skipped";
        reason?: string;
        logs?: {
          assistLogId?: string | null;
          pinyinLogId?: string | null;
        };
      }>,
      errors: [] as string[],
    };

    // 并发 worker: 从队列取任务执行
    const queue = [...articleIds];
    const running: Promise<void>[] = [];

    const startedMs = Date.now();

    async function worker() {
      while (queue.length > 0) {
        const articleId = queue.shift()!;
        try {
          const article = await prisma.article.findUnique({
            where: { id: articleId },
            select: { id: true, title: true },
          });
          if (!article) {
            results.skipped++;
            results.items.push({ articleId, status: "skipped", reason: "文章不存在" });
            continue;
          }

          const unified = await runUnifiedCalibration(articleId);

          results.success++;
          results.pinyinCorrections += unified.pinyin.correctionCount;
          results.pinyinUncertain += unified.pinyin.uncertainCount;
          results.items.push({
            articleId,
            title: article.title,
            status: "success",
            logs: {
              assistLogId: unified.aiMeta.logId,
              pinyinLogId: unified.pinyin.logId,
            },
          });
        } catch (error) {
          results.failed++;
          const message = error instanceof Error ? error.message : "处理失败";
          results.items.push({ articleId, status: "failed", reason: message });
          results.errors.push(`${articleId}: ${message}`);
        }
      }
    }

    // 启动并发 worker
    for (let i = 0; i < MAX_CONCURRENCY; i++) {
      running.push(worker());
    }
    await Promise.all(running);

    results.completedAt = new Date().toISOString();
    results.durationMs = Date.now() - startedMs;

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量 Unified 处理失败";
    console.error("[batch-unified]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
