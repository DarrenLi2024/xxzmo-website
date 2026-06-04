"use client";

import { useState } from "react";
import Link from "next/link";
import type { TopicGroup } from "@/lib/home-queries";

interface Props {
  groups: TopicGroup[];
}

export function BlogTopicGarden({ groups }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  // 必须在 hooks 之后调用
  if (!groups.length) return null;

  const activeGroup = groups[Math.min(activeIdx, groups.length - 1)];

  return (
    <section className="mb-16 md:mb-24">
      {/* 区域标题 */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="w-1 h-4 bg-accent rounded-full" />
        <h2 className="text-xs font-medium text-ink-400 tracking-[0.15em] uppercase">
          漫步主题园
        </h2>
      </div>

      {/* 胶囊导航 */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none -mx-1 px-1">
        {groups.map((g, i) => (
          <button
            key={g.key}
            onClick={() => setActiveIdx(i)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-kai transition-all duration-200 ${
              i === activeIdx
                ? "bg-ink-900 text-white shadow-sm"
                : "bg-white text-ink-500 border border-paper-200 hover:border-paper-300 hover:text-ink-700"
            }`}
          >
            {g.label}
          </button>
        ))}
      </nav>

      {/* 当前主题的文章列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {activeGroup.articles.slice(0, 6).map((article) => (
          <Link
            key={article.id}
            href={`/${article.source}/${article.slug}`}
            className="group block p-4 md:p-5 rounded-xl border border-paper-200 bg-white hover:border-paper-300 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-paper-100 text-ink-400 font-medium font-kai">
                {article.type}
              </span>
            </div>
            <h3 className="text-sm md:text-base font-serif text-ink-800 font-medium group-hover:text-accent transition-colors line-clamp-1 mb-1.5">
              {article.title}
            </h3>
            {article.body && (
              <p className="text-xs text-ink-400 font-kai line-clamp-2 leading-relaxed">
                {truncateExcerpt(article.body, 60)}
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* 更多链接 */}
      {activeGroup.articles.length > 6 && (
        <div className="mt-4 text-center">
          <Link
            href={`/search?tag=${encodeURIComponent(activeGroup.articles[0]?.tags[0] || activeGroup.key)}`}
            className="text-xs text-accent font-kai hover:text-accent-dim transition-colors"
          >
            查看更多「{activeGroup.label}」
          </Link>
        </div>
      )}
    </section>
  );
}

function truncateExcerpt(body: string, maxLen: number): string {
  if (!body) return "";
  const cleaned = body.replace(/[「」""''『』《》【】\s]/g, "").trim();
  return cleaned.length <= maxLen ? cleaned : cleaned.slice(0, maxLen) + "…";
}
