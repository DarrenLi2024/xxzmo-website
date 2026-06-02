export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { HomeSections } from "@/components/home/HomeSections";
import { DailyQuoteSection } from "@/components/home/DailyQuoteSection";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* 标题区 */}
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-serif text-ink-900 tracking-widest">
            闲心子墨
          </h1>
          <p className="text-sm text-ink-400 font-kai mt-3">
            樗栎本无用，天地一散人
          </p>
        </header>

        {/* 精选 + 主题 */}
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
          <HomeSections />
        </Suspense>

        {/* 每日名言 */}
        <div className="mt-16">
          <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
            <DailyQuoteSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
