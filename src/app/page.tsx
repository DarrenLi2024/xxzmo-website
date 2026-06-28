import { Suspense } from "react";
import { getHomeStats, getHeroArticle, getFeaturedArticles, getTopicGroups } from "@/lib/home-queries";
import { BlogHero } from "@/components/home/BlogHero";
import { BlogFeed } from "@/components/home/BlogFeed";
import { BlogTopicGarden } from "@/components/home/BlogTopicGarden";
import { DailyQuoteSection } from "@/components/home/DailyQuoteSection";
import { Skeleton } from "@/components/ui/skeleton";

// 30 秒 ISR 缓存，平衡实时性与性能
export const revalidate = 30;

export default async function HomePage() {
  const [stats, hero, featured, groups] = await Promise.all([
    getHomeStats(),
    getHeroArticle(),
    getFeaturedArticles(),
    getTopicGroups(),
  ]);

  const filteredFeatured = hero
    ? featured.filter(a => a.id !== hero.id).slice(0, 4)
    : featured.slice(0, 4);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Hero — 沉浸式主视觉 */}
        {hero ? (
          <BlogHero hero={hero} stats={stats} />
        ) : (
          <HeroEmpty stats={stats} />
        )}

        {/* 近作 — 卡片网格 */}
        {filteredFeatured.length > 0 && (
          <Suspense fallback={<FeedSkeleton />}>
            <BlogFeed articles={filteredFeatured} />
          </Suspense>
        )}

        {/* 主题花园 — 胶囊导航 + 分组卡片 */}
        {groups.length > 0 && (
          <Suspense fallback={<GardenSkeleton />}>
            <BlogTopicGarden groups={groups} />
          </Suspense>
        )}

        {/* 每日一句 — 底部收束 */}
        <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
          <DailyQuoteSection />
        </Suspense>
      </div>
    </div>
  );
}

// === 降级占位 ===

function HeroEmpty({ stats }: { stats: Awaited<ReturnType<typeof getHomeStats>> }) {
  const daysAgo = stats.recentUpdatedAt
    ? Math.max(1, Math.floor((Date.now() - stats.recentUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <section className="relative overflow-hidden rounded-2xl mb-16 md:mb-24">
      <div className="relative w-full aspect-[17/7] overflow-hidden rounded-2xl bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <p className="text-white/70 text-xs md:text-sm font-kai tracking-[0.3em] mb-3">
            樗栎本无用，天地一散人
          </p>
          <h1 className="text-4xl md:text-6xl font-serif text-white tracking-[0.15em]">
            闲心子墨
          </h1>
          <p className="mt-6 text-white/40 text-sm font-kai">
            {daysAgo ? `${daysAgo} 天前更新 · ` : ""}共 {stats.totalPublished} 篇诗文
          </p>
        </div>
      </div>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <section className="mb-16 md:mb-24">
      <div className="h-4 w-12 bg-paper-200 rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="col-span-2 row-span-2 aspect-[17/7] bg-paper-200 rounded-2xl animate-pulse" />
        <div className="aspect-[17/7] bg-paper-200 rounded-2xl animate-pulse" />
        <div className="aspect-[17/7] bg-paper-200 rounded-2xl animate-pulse" />
      </div>
    </section>
  );
}

function GardenSkeleton() {
  return (
    <section className="mb-16 md:mb-24">
      <div className="h-4 w-20 bg-paper-200 rounded mb-6 animate-pulse" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-16 bg-paper-200 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-paper-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}
