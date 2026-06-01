import { Suspense } from "react";
import { ArticleFlow } from "@/components/article/ArticleFlow";
import { DailyQuoteSection } from "@/components/home/DailyQuoteSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Container, Spacer, H1, Subtitle } from "@/components/design-system";

export default function HomePage() {
  return (
    <Container size="lg" className="py-12">
      <section className="text-center mb-12 animate-fade-in-up">
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

      <Spacer size="lg" />

      <Suspense
        fallback={
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        }
      >
        <ArticleFlow />
      </Suspense>

      <Spacer size="xl" />

      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <DailyQuoteSection />
      </Suspense>
    </Container>
  );
}