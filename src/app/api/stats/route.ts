import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit: 60 stats reads per minute per IP
  const rateLimit = checkRateLimit(rateLimitKey(request, "stats"), 60, 60000);
  if (!rateLimit.allowed) {
    return rateLimitResponse("请求过于频繁，请稍后再试", rateLimit);
  }

  try {
    const [
      chuliCount, jiguCount, tagCount, draftCount, reviewCount,
      paintingCoveredCount, aiCoveredCount, articleTotal,
      recentArticles, recentActions, typeDistribution, monthlyTrends,
    ] = await Promise.all([
      prisma.article.count({ where: { source: "chuli", status: "published" } }),
      prisma.article.count({ where: { source: "jigu", status: "published" } }),
      prisma.tag.count(),
      prisma.article.count({ where: { status: "draft" } }),
      prisma.article.count({ where: { status: "review" } }),
      prisma.article.count({ where: { paintingId: { not: null } } }),
      prisma.article.count({
        where: {
          OR: [
            { annotations: { not: null } },
            { translation: { not: null } },
            { appreciation: { not: null } },
            { aiRawOutput: { not: null } },
          ],
        },
      }),
      prisma.article.count(),

      // Recent activity (last 10 actions) - only return timestamps, not titles for privacy
      prisma.article.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { status: true, updatedAt: true, source: true },
      }),

      prisma.adminActionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Content type distribution
      prisma.article.groupBy({
        by: ["type"],
        where: { status: "published" },
        _count: true,
      }),

      // Monthly trends (last 6 months) - published articles
      prisma.article.findMany({
        where: { status: "published" },
        select: { publishedAt: true, source: true },
        orderBy: { publishedAt: "desc" },
        take: 200,
      }),
    ]);

    // Process monthly trends
    const monthlyData: Record<string, { chuli: number; jigu: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[key] = { chuli: 0, jigu: 0 };
    }

    const sourceTotals = {
      chuli: chuliCount,
      jigu: jiguCount,
    };
    const totalPublished = chuliCount + jiguCount;

    for (const a of monthlyTrends) {
      if (!a.publishedAt) continue;
      const d = new Date(a.publishedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[key] && a.source in monthlyData[key]) {
        monthlyData[key][a.source as "chuli" | "jigu"]++;
      }
    }

    return NextResponse.json({
      chuliCount,
      jiguCount,
      tagCount,
      pendingCount: draftCount,
      reviewCount,
      totalPublished,
      sourceRatio: {
        chuli: totalPublished > 0 ? Math.round((sourceTotals.chuli / totalPublished) * 100) : 0,
        jigu: totalPublished > 0 ? Math.round((sourceTotals.jigu / totalPublished) * 100) : 0,
      },
      coverage: {
        painting: articleTotal > 0 ? Math.round((paintingCoveredCount / articleTotal) * 100) : 0,
        ai: articleTotal > 0 ? Math.round((aiCoveredCount / articleTotal) * 100) : 0,
      },
      health: {
        articleTotal,
        paintingCoveredCount,
        aiCoveredCount,
        draftCount,
        reviewCount,
      },
      recentActivity: recentArticles.map((a) => ({
        source: a.source,
        status: a.status,
        time: a.updatedAt.toISOString(),
      })),
      recentActions: recentActions.map((action) => ({
        action: action.action,
        entityType: action.entityType,
        entityId: action.entityId,
        summary: action.summary,
        time: action.createdAt.toISOString(),
      })),
      typeDistribution: typeDistribution.map((t) => ({
        type: t.type,
        count: t._count,
      })),
      monthlyTrends: Object.entries(monthlyData).map(([month, counts]) => ({
        month,
        ...counts,
      })),
    });
  } catch (error) {
    console.error("Failed to load stats", error);
    return NextResponse.json({ error: "统计数据获取失败" }, { status: 500 });
  }
}
