import Link from "next/link";
import { PenLine, BookOpen } from "lucide-react";
import type { HomeStats } from "@/lib/home-queries";

interface Props {
  stats: HomeStats;
}

export function HomeGate({ stats }: Props) {
  const daysAgo = stats.recentUpdatedAt
    ? Math.max(1, Math.floor((Date.now() - stats.recentUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <section className="text-center pt-6 pb-16">
      {/* 品牌声明 */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif text-ink-900 tracking-[0.25em] mb-4">
          闲心子墨
        </h1>
        <p className="text-sm md:text-base text-accent font-kai">
          樗栎本无用，天地一散人
        </p>
      </div>

      {/* 双源入口 — 非对称左右分栏 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
        {/* 樗栎集 — 原创 */}
        <Link
          href="/chuli"
          className="group relative overflow-hidden rounded-2xl border border-paper-200 bg-white p-6 text-left no-underline transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <PenLine size={20} className="text-accent" />
            </div>
            <span className="text-[10px] text-ink-300 font-medium tracking-wider uppercase">
              原创
            </span>
          </div>
          <h2 className="text-xl font-serif text-ink-900 mb-1.5 group-hover:text-accent transition-colors">
            樗栎集
          </h2>
          <p className="text-xs text-ink-500 leading-relaxed mb-3">
            狂野君的诗文自留地。诗、词、文、赋，偶有所感，信笔由之。
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-ink-900 tabular-nums">
              {stats.chuliCount}
            </span>
            <span className="text-xs text-ink-400">篇作品</span>
            <span className="ml-auto text-xs text-accent group-hover:translate-x-1 transition-transform duration-200">
              进入 →
            </span>
          </div>
        </Link>

        {/* 辑古录 — 经典 */}
        <Link
          href="/jigu"
          className="group relative overflow-hidden rounded-2xl border border-paper-200 bg-white p-6 text-left no-underline transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100/50 flex items-center justify-center">
              <BookOpen size={20} className="text-amber-700" />
            </div>
            <span className="text-[10px] text-ink-300 font-medium tracking-wider uppercase">
              典藏
            </span>
          </div>
          <h2 className="text-xl font-serif text-ink-900 mb-1.5 group-hover:text-amber-700 transition-colors">
            辑古录
          </h2>
          <p className="text-xs text-ink-500 leading-relaxed mb-3">
            前人珠玉，辑而录之。附注释、译文、赏析与校勘。
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-ink-900 tabular-nums">
              {stats.jiguCount}
            </span>
            <span className="text-xs text-ink-400">篇典藏</span>
            <span className="ml-auto text-xs text-amber-600 group-hover:translate-x-1 transition-transform duration-200">
              进入 →
            </span>
          </div>
        </Link>
      </div>

      {/* 统计行 */}
      <div className="flex items-center justify-center gap-6 text-xs text-ink-400">
        <span>
          今已收录 <strong className="text-ink-700 font-medium tabular-nums">{stats.totalPublished}</strong> 篇诗文
        </span>
        <span className="w-1 h-1 rounded-full bg-ink-200" />
        {daysAgo && (
          <span>
            最近更新于 <strong className="text-ink-700 font-medium">{daysAgo}</strong> 天前
          </span>
        )}
      </div>

      {/* 向下滚动引导 */}
      <div className="mt-12 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-[10px] text-ink-300 tracking-wider">向下探索</span>
        <div className="w-5 h-8 rounded-full border border-ink-200 flex items-start justify-center p-1">
          <div className="w-1 h-2 bg-ink-300 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
