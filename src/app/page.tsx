import { Suspense } from "react";
import { HomeSections } from "@/components/home/HomeSections";
import { DailyQuoteSection } from "@/components/home/DailyQuoteSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Container, Spacer, H1, Subtitle } from "@/components/design-system";

export default function HomePage() {
  return (
    <Container size="lg" className="py-12">
      {/* Hero */}
      <section className="text-center mb-16">
        <div className="relative inline-block">
          <H1 className="text-4xl md:text-5xl tracking-widest mb-4">
            闲心子墨
          </H1>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-accent rounded-full" />
        </div>
        <Subtitle className="font-kai text-lg mt-6 text-ink-500">
          樗栎本无用，天地一散人
        </Subtitle>
      </section>

      {/* 精选 + 主题分组 */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <HomeSections />
      </Suspense>

      <Spacer size="xl" />

      {/* 每日名言 */}
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <DailyQuoteSection />
      </Suspense>
    </Container>
  );
}
