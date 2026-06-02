import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [published, allArticles, tags, logs] = await Promise.all([
      prisma.article.findMany({
        where: { status: "published" },
        select: {
          source: true, type: true, pinyin: true, annotations: true, paintingId: true,
        },
      }),
      prisma.article.findMany({
        select: { status: true },
      }),
      prisma.tag.count(),
      prisma.adminActionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { action: true, summary: true, createdAt: true },
      }),
    ]);

    const chuliCount = published.filter(a => a.source === "chuli").length;
    const jiguCount = published.filter(a => a.source === "jigu").length;
    const draftCount = allArticles.filter(a => a.status === "draft").length;
    const reviewCount = allArticles.filter(a => a.status === "review").length;
    const withPinyin = published.filter(a => a.pinyin).length;
    const withAnnotations = published.filter(a => a.annotations).length;
    const withPainting = published.filter(a => a.paintingId).length;

    // 体裁分布
    const typeMap: Record<string, number> = {};
    for (const a of published) {
      const t = a.type || "诗";
      typeMap[t] = (typeMap[t] || 0) + 1;
    }
    const typeDistribution = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const recentActions = logs.map(l => ({
      action: l.action,
      summary: l.summary,
      time: timeAgo(l.createdAt),
    }));

    return NextResponse.json({
      totalPublished: published.length,
      chuliCount, jiguCount,
      draftCount, reviewCount,
      tagCount: tags,
      withPinyin, withAnnotations, withPainting,
      typeDistribution,
      recentActions,
      monthlyTrends: [],
    }, {
      headers: { "Cache-Control": "public, s-maxage=120" },
    });
  } catch (error) {
    console.error("dashboard error:", error);
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN");
}
