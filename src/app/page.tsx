export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getHomeStats, getHeroArticle, getFeaturedArticles, getTopicGroups } from "@/lib/home-queries";
import { HomeGate } from "@/components/home/HomeGate";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { HomeGarden } from "@/components/home/HomeGarden";
import { DailyQuoteSection } from "@/components/home/DailyQuoteSection";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================
// 首页三进式布局
// 一进·门厅 — 品牌声明 + 双源入口
// 二进·正堂 — 精选荐读 + 作者引力
// 三进·后院 — 主题花园 + 名言收束
// ============================================================

export default async function HomePage() {
  // Sequential: hero first, then featured can exclude hero
  const [stats, hero] = await Promise.all([
    getHomeStats(),
    getHeroArticle(),
  ]);

  const [featured, groups] = await Promise.all([
    getFeaturedArticles(hero?.id),
    getTopicGroups(),
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* 一进 · 门厅 */}
        <HomeGate stats={stats} />

        {/* 二进 · 正堂 */}
        {hero ? (
          <Suspense fallback={<ShowcaseSkeleton />}>
            <HomeShowcase hero={hero} featured={featured} />
          </Suspense>
        ) : (
          <ShowcaseEmpty />
        )}

        {/* 名言过渡 */}
        <div className="mb-20">
          <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
            <DailyQuoteSection />
          </Suspense>
        </div>

        {/* 三进 · 后院 */}
        {groups.length > 0 && (
          <Suspense fallback={<GardenSkeleton />}>
            <HomeGarden groups={groups} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 降级骨架屏
// ============================================================

function ShowcaseSkeleton() {
  return (
    <section className="mb-20">
      <div className="h-4 w-20 bg-paper-200 rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4 md:gap-6">
        <div className="md:col-span-5">
          <div className="aspect-[4/3] bg-paper-200 rounded-2xl animate-pulse" />
          <div className="p-6 space-y-3">
            <div className="h-4 w-16 bg-paper-200 rounded animate-pulse" />
            <div className="h-6 w-3/4 bg-paper-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-paper-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="md:col-span-3 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-paper-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}

function GardenSkeleton() {
  return (
    <section className="mb-20">
      <div className="h-4 w-24 bg-paper-200 rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-40 bg-paper-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}

function ShowcaseEmpty() {
  return (
    <section className="mb-20 py-16 text-center">
      <p className="text-ink-300 font-kai text-lg">暂无荐读</p>
      <p className="text-xs text-ink-300 mt-2">待山房主人发布第一篇诗文</p>
    </section>
  );
}
