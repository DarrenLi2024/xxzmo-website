import { prisma } from "@/lib/prisma";
import { serializeArticleListItem } from "@/lib/serialize";
import { HomeHero } from "./HomeHero";
import { HomeTopicTabs } from "./HomeTopicTabs";
import { HomeFeatured } from "./HomeFeatured";
import type { ArticleListItem } from "@/lib/serialize";

const TOPIC_GROUPS: Record<string, { label: string; tags: string[] }> = {
  "节序时令": { label: "节序时令", tags: ["春节", "清明", "中秋", "重阳", "除夕", "立春", "春景", "秋景", "时令", "白露", "冬至", "元日", "上元"] },
  "怀古咏史": { label: "怀古咏史", tags: ["怀古", "咏史", "历史", "魏晋", "隋唐", "三国"] },
  "羁旅思亲": { label: "羁旅思亲", tags: ["思乡", "羁旅", "怀人", "思亲", "悼亡", "母亲", "父亲"] },
  "田园隐逸": { label: "田园隐逸", tags: ["田园", "隐逸", "山水", "闲适", "写景", "登临"] },
  "感怀遣愁": { label: "感怀遣愁", tags: ["愁绪", "感怀", "孤寂", "咏怀", "梦", "夜"] },
  "赠答酬唱": { label: "赠答酬唱", tags: ["赠答", "友情", "送别", "爱情", "闺怨"] },
  "咏物写意": { label: "咏物写意", tags: ["咏物", "写雪", "梅花", "柳树", "写山", "黄河", "写马", "饮酒"] },
  "励志感时": { label: "励志感时", tags: ["励志", "惜时", "哲理", "读书"] },
};

export async function HomeSections() {
  const articles = await prisma.article.findMany({
    where: { status: "published" },
    include: { tags: { include: { tag: true } }, painting: true },
    orderBy: { createdAt: "desc" as const },
    take: 200,
  });

  const list: ArticleListItem[] = articles.map(a => serializeArticleListItem(a, 120));

  // Hero: 最新一篇带配图的文章
  const heroArticle = list.find(a => a.painting) || list[0];

  // 精选: 剩余有配图的 4 篇
  const featured = list.filter(a => a.painting && a.id !== heroArticle?.id).slice(0, 4);

  // 主题分组
  const groups = Object.entries(TOPIC_GROUPS).map(([key, group]) => {
    const matched = list.filter(a =>
      a.tags.some(tag => group.tags.includes(tag))
    ).slice(0, 6);
    return { key, label: group.label, articles: matched };
  }).filter(g => g.articles.length > 0);

  return (
    <div>
      {/* Hero 每日精选 */}
      {heroArticle && <HomeHero featured={heroArticle} />}

      {/* 精选推荐（小卡片） */}
      {featured.length >= 2 && (
        <section className="mb-12">
          <HomeFeatured articles={featured} />
        </section>
      )}

      {/* 主题标签页 */}
      {groups.length > 0 && <HomeTopicTabs groups={groups} />}
    </div>
  );
}
