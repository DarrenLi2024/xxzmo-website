import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      where: { status: "published" },
      select: {
        type: true,
        source: true,
        status: true,
        createdAt: true,
        annotations: true,
        translation: true,
        appreciation: true,
        pinyin: true,
        paintingId: true,
        body: true,
        tags: { include: { tag: { select: { name: true } } } },
      },
    });

    // 体裁分布
    const byType: Record<string, number> = {};
    for (const a of articles) {
      const t = a.type || "诗";
      byType[t] = (byType[t] || 0) + 1;
    }

    // 来源分布
    const bySource = { chuli: 0, jigu: 0 };
    for (const a of articles) {
      if (a.source === "chuli") bySource.chuli++;
      else if (a.source === "jigu") bySource.jigu++;
    }

    // 状态分布
    const allArticles = await prisma.article.findMany({
      select: { status: true },
    });
    const byStatus = { draft: 0, review: 0, published: 0 };
    for (const a of allArticles) {
      if (a.status === "draft") byStatus.draft++;
      else if (a.status === "review") byStatus.review++;
      else if (a.status === "published") byStatus.published++;
    }

    // 月度趋势
    const monthMap: Record<string, number> = {};
    for (const a of articles) {
      const d = a.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    }
    const byMonth = Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 热门标签
    const tagMap: Record<string, number> = {};
    for (const a of articles) {
      for (const t of a.tags) {
        tagMap[t.tag.name] = (tagMap[t.tag.name] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    // 完整度统计
    const withAnnotations = articles.filter(a => a.annotations).length;
    const withTranslation = articles.filter(a => a.translation).length;
    const withAppreciation = articles.filter(a => a.appreciation).length;
    const withPinyin = articles.filter(a => a.pinyin).length;
    const withPainting = articles.filter(a => a.paintingId).length;
    const avgBodyLength = articles.length > 0
      ? Math.round(articles.reduce((s, a) => s + a.body.length, 0) / articles.length)
      : 0;

    return NextResponse.json({
      totalArticles: articles.length,
      byType,
      bySource,
      byStatus,
      byMonth,
      topTags,
      avgBodyLength,
      withAnnotations,
      withTranslation,
      withAppreciation,
      withPinyin,
      withPainting,
      generatedAt: new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  } catch (error) {
    console.error("audit error:", error);
    return NextResponse.json({ error: "生成审计报告失败" }, { status: 500 });
  }
}
