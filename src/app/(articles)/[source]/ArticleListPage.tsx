"use client";

import { useState, useEffect, useCallback } from "react";
import { ArticleCard } from "@/components/article/ArticleCard";
import { TypeTabBar } from "@/components/common/TypeTabBar";
import type { ArticleListItem } from "@/lib/serialize";

const SOURCE_LABELS: Record<string, string> = {
  chuli: "樗栎集",
  jigu: "辑古录",
};

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  chuli: "狂野君原创诗文",
  jigu: "前人经典收藏",
};

export function ArticleListPage({ source }: { source: string }) {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("全部");
  const [tag, setTag] = useState("");

  // 从文章数据中提取所有体裁
  const allTypes = ["全部", ...Array.from(new Set(articles.map(a => a.type || "诗"))).sort()];
  const typeCounts: Record<string, number> = {};
  for (const a of articles) {
    const t = a.type || "诗";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const filtered = selectedType === "全部"
    ? articles
    : articles.filter(a => (a.type || "诗") === selectedType);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tag) params.set("tag", tag);
      params.set("pageSize", "200");
      const res = await fetch(`/api/articles?source=${source}&${params.toString()}`);
      const data = await res.json();
      setArticles(data.articles);
    } finally {
      setLoading(false);
    }
  }, [source, tag]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif text-ink-900 mb-1 tracking-wide">
        {SOURCE_LABELS[source] || source}
      </h1>
      <p className="text-sm text-ink-400 mb-6 font-kai">
        {SOURCE_DESCRIPTIONS[source]} · {articles.length} 篇
      </p>

      {/* 体裁 Tab 栏 */}
      {allTypes.length > 2 && (
        <div className="mb-8">
          <TypeTabBar
            types={allTypes}
            selected={selectedType}
            counts={typeCounts}
            onChange={setSelectedType}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-paper-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-ink-300 font-kai">
          {selectedType === "全部" ? "暂无文章" : `暂无「${selectedType}」体裁的作品`}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((article, i) => (
            <div
              key={article.id}
              className="animate-in fade-in slide-in-from-bottom-3"
              style={{
                animationDelay: `${Math.min(i * 60, 400)}ms`,
                animationDuration: "400ms",
                animationFillMode: "both",
              }}
            >
              <ArticleCard
                slug={article.slug}
                title={article.title}
                type={article.type}
                author={article.author}
                dateRaw={article.dateRaw}
                body={article.body}
                tags={article.tags}
                source={article.source}
                painting={article.painting}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
