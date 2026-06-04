import Link from "next/link";
import Image from "next/image";
import type { FeaturedArticle } from "@/lib/home-queries";

interface Props {
  articles: FeaturedArticle[];
}

export function BlogFeed({ articles }: Props) {
  if (!articles.length) return null;

  return (
    <section className="mb-16 md:mb-24">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="w-1 h-4 bg-accent rounded-full" />
        <h2 className="text-xs font-medium text-ink-400 tracking-[0.15em] uppercase">
          近作
        </h2>
      </div>

      {/* 卡片网格：首篇大卡占 2 列，其余小卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {articles.map((article, i) => {
          const isLarge = i === 0;
          return (
            <Link
              key={article.id}
              href={`/${article.source}/${article.slug}`}
              className={`group relative overflow-hidden rounded-2xl border border-paper-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${
                isLarge ? "col-span-2 md:col-span-2 md:row-span-2 aspect-[17/7]" : "aspect-[17/7]"
              }`}
            >
              {/* 配图 */}
              {article.painting ? (
                <>
                  <Image
                    src={article.painting.thumbnail || article.painting.url}
                    alt={article.painting.title || article.title}
                    fill
                    sizes={isLarge ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/15 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-paper-100 to-paper-200" />
              )}

              {/* 文字信息 */}
              <div className="absolute inset-x-0 bottom-0 p-4">
                {isLarge ? (
                  <>
                    <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">
                      {article.type}
                    </span>
                    <h3 className="text-lg md:text-xl font-serif text-white font-medium mt-1 line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    {article.body && (
                      <p className="text-sm text-white/65 font-kai mt-1.5 line-clamp-1 leading-relaxed">
                        {truncateExcerpt(article.body, 40)}
                      </p>
                    )}
                    <p className="text-xs text-white/45 font-kai mt-2">
                      {article.author || "狂野君"}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">
                      {article.type}
                    </span>
                    <h3 className="text-sm font-serif text-white font-medium mt-0.5 line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-xs text-white/45 font-kai mt-1.5">
                      {article.author || "狂野君"}
                    </p>
                  </>
                )}
              </div>

              {/* 装饰标签 */}
              {article.tags[0] && (
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white/70 font-kai">
                    {article.tags[0]}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function truncateExcerpt(body: string, maxLen: number): string {
  if (!body) return "";
  const cleaned = body.replace(/[「」""''『』《》【】\s]/g, "").trim();
  return cleaned.length <= maxLen ? cleaned : cleaned.slice(0, maxLen) + "…";
}
