import Link from "next/link";
import Image from "next/image";
import type { ArticleListItem } from "@/lib/serialize";

/**
 * 每日精选 Hero — 取最新一篇带配图的文章
 * 大幅居中展示摘句 + 配图，替代原来的标题 Hero
 */
export function HomeHero({ featured }: { featured: ArticleListItem }) {
  // 摘取前两句（到第一个句号或40字）
  const body = featured.body || "";
  const excerpt = extractExcerpt(body);

  return (
    <Link
      href={`/${featured.source}/${featured.slug}`}
      className="group block relative overflow-hidden rounded-2xl mb-16"
    >
      {/* 背景配图 */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden">
        {featured.painting ? (
          <Image
            src={featured.painting.thumbnail || featured.painting.url}
            alt={featured.painting.title}
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-paper-100 via-paper-50 to-accent-bg" />
        )}
        {/* 遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" />
        <div className="absolute inset-0 bg-ink-900/5" />
      </div>

      {/* 文字内容 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <div className="max-w-2xl">
          <span className="inline-block text-xs text-white/50 font-medium tracking-wider uppercase mb-3 px-2 py-0.5 border border-white/20 rounded-full">
            每日精选
          </span>
          <blockquote className="text-lg md:text-2xl font-serif text-white leading-relaxed mb-4 tracking-wide">
            {excerpt}
          </blockquote>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80 font-serif">{featured.title}</span>
            <span className="text-white/30">·</span>
            <span className="text-sm text-white/60 font-kai">{featured.author}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** 提取首句精华：到第一个句号，最多 60 字 */
function extractExcerpt(text: string): string {
  const clean = text.replace(/\n/g, "").trim();
  const periodIdx = clean.search(/[。！？]/);
  if (periodIdx > 0 && periodIdx <= 60) {
    return clean.slice(0, periodIdx + 1);
  }
  return clean.slice(0, Math.min(60, clean.length)) + (clean.length > 60 ? "…" : "");
}
