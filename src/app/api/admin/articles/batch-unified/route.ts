import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// 批量 Unified 处理 — 异步分片模式 (Vercel Serverless 友好)
// ============================================================
//
// POST   /api/admin/articles/batch-unified          — 启动批量任务，返回 taskId
// GET    /api/admin/articles/batch-unified?taskId=  — 轮询任务进度
//
// 每片处理 3 篇文章，片内串行，片间由前端按 taskId 逐片触发。
// 这样每片 Vercel Function 执行时间 < 60s（Hobby 计划限制）。

interface BatchTask {
  taskId: string;
  status: "queued" | "running" | "completed" | "failed";
  articleIds: string[];
  concurrency: number;
  chunkSize: number;
  currentIndex: number; // 已处理到的文章索引
  total: number;
  success: number;
  failed: number;
  skipped: number;
  pinyinCorrections: number;
  pinyinUncertain: number;
  startedAt: string;
  completedAt: string | null;
  items: Array<{
    articleId: string;
    title?: string;
    status: "success" | "failed" | "skipped";
    reason?: string;
  }>;
  errors: string[];
}

// In-memory task store (生产环境建议用 Redis/DB)
const tasks = new Map<string, BatchTask>();

function taskKey() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  try {
    const { articleIds, concurrency = 5, chunkSize = 3 } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章ID列表" }, { status: 400 });
    }

    const providerCount = await prisma.llmProvider.count({ where: { enabled: true } });
    if (providerCount === 0) {
      return NextResponse.json({ error: "未配置可用的 LLM Provider" }, { status: 400 });
    }

    const tid = taskKey();
    const task: BatchTask = {
      taskId: tid,
      status: "queued",
      articleIds,
      concurrency: Math.min(concurrency, 5),
      chunkSize: Math.min(chunkSize, 5),
      currentIndex: 0,
      total: articleIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      pinyinCorrections: 0,
      pinyinUncertain: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      items: [],
      errors: [],
    };

    tasks.set(tid, task);

    return NextResponse.json({
      taskId: tid,
      total: task.total,
      chunkSize: task.chunkSize,
      message: `任务已创建，共 ${task.total} 篇，每片 ${task.chunkSize} 篇，请轮询进度`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建任务失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const action = searchParams.get("action"); // "status" | "execute"

    if (!taskId) {
      // 没有 taskId 时列出所有活跃任务
      const active = Array.from(tasks.values())
        .filter((t) => t.status !== "completed" && t.status !== "failed")
        .slice(0, 5);
      return NextResponse.json({ tasks: active });
    }

    const task = tasks.get(taskId);
    if (!task) {
      return NextResponse.json({ error: "任务不存在或已过期" }, { status: 404 });
    }

    if (action === "execute") {
      // 执行下一片
      return await executeChunk(task);
    }

    // 默认：返回进度
    return NextResponse.json({
      taskId: task.taskId,
      status: task.status,
      progress: {
        current: task.currentIndex,
        total: task.total,
        percent: task.total > 0 ? Math.round((task.currentIndex / task.total) * 100) : 0,
        success: task.success,
        failed: task.failed,
        skipped: task.skipped,
        pinyinCorrections: task.pinyinCorrections,
        pinyinUncertain: task.pinyinUncertain,
      },
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取任务状态失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function executeChunk(task: BatchTask) {
  if (task.currentIndex >= task.total) {
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    return NextResponse.json({
      taskId: task.taskId,
      status: "completed",
      progress: {
        current: task.currentIndex,
        total: task.total,
        percent: 100,
        success: task.success,
        failed: task.failed,
        skipped: task.skipped,
        pinyinCorrections: task.pinyinCorrections,
        pinyinUncertain: task.pinyinUncertain,
      },
    });
  }

  task.status = "running";

  const { runUnifiedCalibration } = await import("@/lib/unified-calibration");

  const end = Math.min(task.currentIndex + task.chunkSize, task.total);
  const chunk = task.articleIds.slice(task.currentIndex, end);

  for (const articleId of chunk) {
    try {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { id: true, title: true },
      });

      if (!article) {
        task.skipped++;
        task.items.push({ articleId, status: "skipped", reason: "文章不存在" });
        continue;
      }

      const unified = await runUnifiedCalibration(articleId);

      task.success++;
      task.pinyinCorrections += unified.pinyin.correctionCount;
      task.pinyinUncertain += unified.pinyin.uncertainCount;
      task.items.push({ articleId, title: article.title, status: "success" });
    } catch (error) {
      task.failed++;
      const message = error instanceof Error ? error.message : "处理失败";
      task.items.push({ articleId, status: "failed", reason: message });
      task.errors.push(`${articleId}: ${message}`);
    }
  }

  task.currentIndex = end;

  // 清理 completed 任务（保留最近 50 个）
  if (tasks.size > 50) {
    const toDelete: string[] = [];
    for (const [key, val] of tasks) {
      if (val.status === "completed" || val.status === "failed") {
        toDelete.push(key);
      }
    }
    for (const key of toDelete.slice(0, toDelete.length - 10)) {
      tasks.delete(key);
    }
  }

  return NextResponse.json({
    taskId: task.taskId,
    status: task.currentIndex >= task.total ? "completed" : "running",
    progress: {
      current: task.currentIndex,
      total: task.total,
      percent: task.total > 0 ? Math.round((task.currentIndex / task.total) * 100) : 0,
      success: task.success,
      failed: task.failed,
      skipped: task.skipped,
      pinyinCorrections: task.pinyinCorrections,
      pinyinUncertain: task.pinyinUncertain,
    },
    lastChunk: chunk.length,
  });
}
