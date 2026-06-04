import Link from "next/link";
import Image from "next/image";
import type { HeroArticle, FeaturedArticle } from "@/lib/home-queries";

interface Props {
  hero: HeroArticle;
  featured: FeaturedArticle[];
}

export function HomeShowcase({ hero, featured }: Props) {
  const heroExcerpt = extractExcerpt(hero.body);

  return (
    <section className="mb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-4 bg-accent rounded-full" />
        <h2 className="text-xs font-medium text-ink-400 tracking-[0.15em] uppercase">
          今日荐读
        </h2>
      </div>

      {/* 非对称双栏：5/8 主文章 + 3/8 迷你卡 */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4 md:gap-6">
        {/* 左：主推荐 */}
        <div className="md:col-span-5">
          <Link
            href={`/${hero.source}/${hero.slug}`}
            className="group block relative overflow-hidden rounded-2xl border border-paper-200 bg-white hover:shadow-lg transition-all duration-300"
          >
            <div className="relative w-full aspect-[17/7] overflow-hidden rounded-t-2xl">
              {hero.painting ? (
                <Image
                  src={hero.painting.thumbnail || hero.painting.url}
                  alt={hero.painting.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-paper-100 to-paper-200" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 via-transparent to-transparent" />
            </div>
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 bg-paper-100 rounded text-ink-500 font-medium">
                  {hero.type}
                </span>
                <span className="text-[10px] text-ink-400">
                  {hero.source === "jigu" ? "辑古录" : "樗栎集"}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-serif text-ink-900 font-medium group-hover:text-accent transition-colors mb-2">
                {hero.title}
              </h3>
              <p className="text-sm text-ink-500 leading-relaxed line-clamp-2 font-kai mb-3">
                {heroExcerpt}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500">{hero.author}</span>
                {hero.painting && (
                  <>
                    <span className="text-ink-200">·</span>
                    <span className="text-xs text-ink-400">
                      配图：{hero.painting.title}
                    </span>
                  </>
                )}
                <span className="ml-auto text-xs text-accent group-hover:translate-x-1 transition-transform duration-200">
                  阅读全文 →
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* 右：3 篇迷你竖排卡 */}
        <div className="md:col-span-3 flex flex-col gap-3">
          {featured.slice(0, 3).map((article) => (
            <Link
              key={article.id}
              href={`/${article.source}/${article.slug}`}
              className="group flex gap-3 p-3 rounded-xl border border-paper-200 bg-white hover:shadow-sm hover:border-paper-300 transition-all duration-200 no-underline"
            >
              <div className="relative w-24 aspect-[17/7] rounded-lg overflow-hidden shrink-0">
                {article.painting ? (
                  <Image
                    src={article.painting.thumbnail || article.painting.url}
                    alt={article.painting.title}
                    fill
                    sizes="80px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-paper-100" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-[10px] text-ink-400 mb-0.5">
                  {article.type}
                </span>
                <h4 className="text-sm font-serif text-ink-800 font-medium group-hover:text-accent transition-colors line-clamp-1">
                  {article.title}
                </h4>
                <p className="text-[11px] text-ink-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {article.body.slice(0, 60)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 作者引力块 */}
      <div className="mt-8 p-6 bg-gradient-to-r from-accent/5 to-transparent rounded-2xl border border-accent/10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-serif text-accent">狂</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-ink-800">
              山房主人 · 狂野君
            </h3>
            <p className="text-xs text-ink-500 mt-1 leading-relaxed">
              性喜山林，偶作诗文。樗栎本无用，天地一散人。
            </p>
          </div>
          <Link
            href="/about"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-accent/30 text-accent text-xs hover:bg-accent/5 transition-colors no-underline"
          >
            了解作者 →
          </Link>
        </div>
      </div>
    </section>
  );
}

function extractExcerpt(text: string): string {
  const clean = text.replace(/\n/g, "").trim();
  const periodIdx = clean.search(/[。！？]/);
  if (periodIdx > 0 && periodIdx <= 80) {
    return clean.slice(0, periodIdx + 1);
  }
  return clean.slice(0, Math.min(80, clean.length)) + (clean.length > 80 ? "…" : "");
}
