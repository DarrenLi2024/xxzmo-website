import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 智能去重：对每组重复文章，按多维度评分保留最优篇
 * 
 * 评分维度（权重）：
 * - 正文是否更完整（长度更长，通常更完整）：25%
 * - 是否有注释/译文/赏析：20%
 * - 是否有拼音/配图：10%
 * - 是否已发布：15%
 * - 更新时间更新：15%
 * - 标题是否更完整：15%
 */
function scoreArticle(a: {
  body: string;
  annotations: string | null;
  translation: string | null;
  appreciation: string | null;
  pinyin: string | null;
  paintingId: string | null;
  status: string;
  updatedAt: Date;
  title: string;
}): number {
  let score = 0;

  // 正文完整度（越长越完整，但超过一定长度后不再加分）
  const bodyLen = a.body.length;
  score += Math.min(bodyLen / 200, 1) * 0.25;

  // 富文本信息
  if (a.annotations) score += 0.10;
  if (a.translation) score += 0.05;
  if (a.appreciation) score += 0.05;

  // 拼音/配图
  if (a.pinyin) score += 0.05;
  if (a.paintingId) score += 0.05;

  // 状态
  if (a.status === "published") score += 0.15;
  else if (a.status === "review") score += 0.08;

  // 更新时间（越新越好）
  const ageInDays = (Date.now() - a.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 1 - ageInDays / 365) * 0.15;

  // 标题完整度
  score += Math.min(a.title.length / 15, 1) * 0.15;

  return score;
}

export async function POST(request: NextRequest) {
  try {
    const { pairs } = await request.json();

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ error: "请提供重复文章对" }, { status: 400 });
    }

    // 收集所有需要比较的文章 ID
    const allIds = new Set<string>();
    for (const pair of pairs) {
      allIds.add(pair.id1);
      allIds.add(pair.id2);
    }

    // 批量查询文章信息
    const articles = await prisma.article.findMany({
      where: { id: { in: [...allIds] } },
      select: {
        id: true,
        title: true,
        body: true,
        annotations: true,
        translation: true,
        appreciation: true,
        pinyin: true,
        paintingId: true,
        status: true,
        updatedAt: true,
      },
    });

    const articleMap = new Map(articles.map(a => [a.id, a]));

    let kept = 0;
    let deleted = 0;

    for (const pair of pairs) {
      const a1 = articleMap.get(pair.id1);
      const a2 = articleMap.get(pair.id2);
      if (!a1 || !a2) continue;

      const s1 = scoreArticle(a1);
      const s2 = scoreArticle(a2);

      // 保留分高的，删除分低的
      const [keep, del] = s1 >= s2 ? [a1, a2] : [a2, a1];

      try {
        await prisma.article.delete({ where: { id: del.id } });
        deleted++;
        kept++;
      } catch {
        // 已删除或不存在，跳过
      }
    }

    return NextResponse.json({ kept, deleted });
  } catch (error) {
    console.error("auto-dedup error:", error);
    return NextResponse.json({ error: "去重失败" }, { status: 500 });
  }
}
