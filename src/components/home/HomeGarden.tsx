import Link from "next/link";
import Image from "next/image";
import type { TopicGroup, TopicArticle } from "@/lib/home-queries";

interface Props {
  groups: TopicGroup[];
}

export function HomeGarden({ groups }: Props) {
  return (
    <section className="mb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-4 bg-accent rounded-full" />
        <h2 className="text-xs font-medium text-ink-400 tracking-[0.15em] uppercase">
          漫步主题园
        </h2>
      </div>

      {/* Bento Grid: 2 列 (mobile) / 4 列 (desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {groups.map((group, groupIndex) => (
          <Link
            key={group.key}
            href={`/search?tag=${encodeURIComponent(group.articles[0]?.tags[0] || group.key)}`}
            className="group block p-4 rounded-2xl border border-paper-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden no-underline"
            style={{
              // 大格 — 第一组和最后一组占 2 列 (仅 desktop)
            }}
          >
            {/* 装饰性背景 */}
            <div
              className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-[0.06] transition-transform duration-500 group-hover:scale-150"
              style={{
                backgroundColor: GROUP_COLORS[groupIndex % GROUP_COLORS.length],
              }}
            />

            {/* 标题行 */}
            <div className="flex items-center justify-between mb-3 relative">
              <h3 className="text-sm font-medium text-ink-800">
                {group.label}
              </h3>
              <span className="text-[10px] text-ink-400 tabular-nums">
                {group.articles.length}篇
              </span>
            </div>

            {/* 文章预览列表 */}
            <div className="space-y-2 relative">
              {group.articles.slice(0, 4).map((article, i) => (
                <div key={article.id} className="flex items-start gap-2">
                  {/* 配图缩略 */}
                  <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 bg-paper-100">
                    {article.painting ? (
                      <Image
                        src={article.painting.thumbnail || article.painting.url}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[8px] text-ink-300">
                          {article.type.slice(0, 1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-700 font-serif line-clamp-1 group-hover:text-accent transition-colors">
                      {article.title}
                    </p>
                    <p className="text-[10px] text-ink-400 line-clamp-1 mt-0.5">
                      {article.body.slice(0, 30)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 更多提示 */}
            {group.articles.length >= 4 && (
              <div className="mt-3 pt-2 border-t border-paper-100 relative">
                <span className="text-[10px] text-ink-400 group-hover:text-accent transition-colors">
                  查看全部 {group.label} 诗文 →
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

// 每个主题组的装饰色
const GROUP_COLORS = [
  "#C4825A", // 赭石
  "#5B8C5B", // 绿
  "#8B5B8C", // 紫
  "#5B8C8C", // 青
  "#C49B4E", // 金
  "#8C5B5B", // 红褐
  "#5B6B8C", // 蓝灰
  "#6B8C5B", // 草绿
];
