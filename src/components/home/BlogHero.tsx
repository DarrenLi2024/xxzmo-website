import Link from "next/link";
import Image from "next/image";
import type { HeroArticle, HomeStats } from "@/lib/home-queries";

interface Props {
  hero: HeroArticle;
  stats: HomeStats;
}

export function BlogHero({ hero, stats }: Props) {
  const excerpt = extractPoeticExcerpt(hero.body);
  const daysAgo = stats.recentUpdatedAt
    ? Math.max(1, Math.floor((Date.now() - stats.recentUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <section className="relative overflow-hidden rounded-2xl mb-16 md:mb-24">
      <div className="relative w-full aspect-[17/7] overflow-hidden rounded-2xl">
        {hero.painting ? (
          <>
            <Image
              src={hero.painting.thumbnail || hero.painting.url}
              alt={hero.painting.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink-900/20 via-ink-900/30 to-ink-900/70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900" />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-16">
          <div className="mb-8 md:mb-10">
            <p className="text-white/70 text-xs md:text-sm font-kai tracking-[0.3em] mb-3">
              樗栎本无用，天地一散人
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white tracking-[0.15em]">
              闲心子墨
            </h1>
          </div>

          {excerpt && (
            <Link
              href={`/${hero.source}/${hero.slug}`}
              className="group block max-w-xl mx-auto"
            >
              <p className="text-white/85 text-base md:text-lg font-kai leading-relaxed line-clamp-3 group-hover:text-white transition-colors duration-300">
                「{excerpt}」
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="text-white/50 text-xs tracking-wide">
                  {hero.title}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="text-white/50 text-xs font-kai">
                  {hero.author || "狂野君"}
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 py-4 px-6">
        <StatBadge label="诗文" value={stats.totalPublished} />
        <span className="w-px h-3 bg-white/20" />
        <StatBadge label="原创" value={stats.chuliCount} />
        <span className="w-px h-3 bg-white/20" />
        <StatBadge label="辑录" value={stats.jiguCount} />
        {daysAgo && (
          <>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-white/40 text-xs">
              {daysAgo} 天前更新
            </span>
          </>
        )}
      </div>
    </section>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/60 text-xs font-kai">{label}</span>
      <span className="text-white/85 text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

function extractPoeticExcerpt(body: string): string {
  if (!body) return "";
  const cleaned = body.replace(/[「」""''『』《》【】\s]/g, "").trim();
  const match = cleaned.match(/^(.{5,14})[，。！？；、]/);
  return match ? match[1] : cleaned.slice(0, 14);
}
