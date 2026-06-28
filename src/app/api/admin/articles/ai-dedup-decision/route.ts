import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { DEDUP_DECISION_SYSTEM, DEDUP_DECISION_USER } from "@/lib/prompts";
import { dedupDecisionSchema } from "@/lib/ai-schemas";

const DEDUP_DECISION_PROMPT_VERSION = "dedup-decision-v1";

interface DuplicatePair {
  id1: string;
  title1: string;
  id2: string;
  title2: string;
  similarity: number;
  type: "exact" | "similar";
}

interface DedupDecisionRequest {
  pairs: DuplicatePair[];
  autoExecute?: boolean;
}

interface DecisionResult {
  pair: DuplicatePair;
  keepId: string;
  deleteId: string;
  confidence: number;
  reason: string;
  error?: string;
}

export async function POST(request: Request) {
  try {
    const { pairs, autoExecute = false }: DedupDecisionRequest =
      await request.json();

    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json(
        { error: "请提供去重配对数据" },
        { status: 400 }
      );
    }

    const decisions: DecisionResult[] = [];
    const toDelete: string[] = [];

    for (const pair of pairs) {
      try {
        const [article1, article2] = await Promise.all([
          prisma.article.findUnique({
            where: { id: pair.id1 },
            select: {
              id: true,
              title: true,
              author: true,
              body: true,
              createdAt: true,
            },
          }),
          prisma.article.findUnique({
            where: { id: pair.id2 },
            select: {
              id: true,
              title: true,
              author: true,
              body: true,
              createdAt: true,
            },
          }),
        ]);

        if (!article1 || !article2) {
          decisions.push({
            pair,
            keepId: "",
            deleteId: "",
            confidence: 0,
            reason: "文章不存在",
            error: "一篇文章已被删除",
          });
          continue;
        }

        const messages = [
          { role: "system" as const, content: DEDUP_DECISION_SYSTEM },
          {
            role: "user" as const,
            content: DEDUP_DECISION_USER(
              {
                id: article1.id,
                title: article1.title,
                author: article1.author,
                body: article1.body,
                createdAt: article1.createdAt.toISOString(),
              },
              {
                id: article2.id,
                title: article2.title,
                author: article2.author,
                body: article2.body,
                createdAt: article2.createdAt.toISOString(),
              }
            ),
          },
        ];

        const aiResult = await runAiTask(
          "article.dedup.decision",
          messages,
          dedupDecisionSchema,
          {
            promptVersion: DEDUP_DECISION_PROMPT_VERSION,
            temperature: 0.3,
            maxTokens: 512,
            timeoutMs: 30000,
            maxRetries: 2,
            maxProviders: 3,
          }
        );

        const result = aiResult.data;
        decisions.push({
          pair,
          keepId: result.keepId,
          deleteId: result.deleteId,
          confidence: result.confidence,
          reason: result.reason,
        });

        if (result.confidence >= 0.7) {
          toDelete.push(result.deleteId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "决策失败";
        console.error("[ai-dedup-decision] 决策失败:", message);

        try {
          const [a1, a2] = await Promise.all([
            prisma.article.findUnique({
              where: { id: pair.id1 },
              select: { id: true, updatedAt: true },
            }),
            prisma.article.findUnique({
              where: { id: pair.id2 },
              select: { id: true, updatedAt: true },
            }),
          ]);

          if (a1 && a2) {
            const keepId =
              new Date(a1.updatedAt) >= new Date(a2.updatedAt)
                ? a1.id
                : a2.id;
            const deleteId = keepId === a1.id ? a2.id : a1.id;

            decisions.push({
              pair,
              keepId,
              deleteId,
              confidence: 0.5,
              reason: "LLM 调用失败，使用规则决策（保留较新版本）",
              error: message,
            });

            toDelete.push(deleteId);
          }
        } catch {
          decisions.push({
            pair,
            keepId: "",
            deleteId: "",
            confidence: 0,
            reason: "",
            error: message,
          });
        }
      }
    }

    const uniqueToDelete = [...new Set(toDelete)];

    if (autoExecute && uniqueToDelete.length > 0) {
      await prisma.article.deleteMany({
        where: { id: { in: uniqueToDelete } },
      });
    }

    return NextResponse.json({
      decisions,
      toDelete: autoExecute ? uniqueToDelete : [],
      deleted: autoExecute ? uniqueToDelete.length : 0,
      total: pairs.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 去重决策失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
