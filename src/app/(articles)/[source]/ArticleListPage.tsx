"use client";

import { useState, useEffect, useCallback } from "react";
import { ArticleCard } from "@/components/article/ArticleCard";
import { FilterBar } from "@/components/common/FilterBar";
import type { ArticleListItem } from "@/lib/serialize";

const SOURCE_LABELS: Record<string, string> = {
  chuli: "樗栎集",
  jigu: "辑古录",
};

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  chuli: "狂野君原创诗文",
  jigu: "前人经典收藏",
};

const EMPTY_TEXT: Record<string, string> = {
  chuli: "没有找到匹配的文章",
  jigu: "辑古台正在采集中...",
};

export function ArticleListPage({ source }: { source: string }) {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (tag) params.set("tag", tag);
      params.set("pageSize", "50");

      const res = await fetch(`/api/articles?source=${source}&${params.toString()}`);
      const data = await res.json();
      setArticles(data.articles);
    } catch (err) {
      console.error(`[ArticleListPage:${source}] 获取文章失败:`, err);
    } finally {
      setLoading(false);
    }
  }, [source, type, tag]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif text-ink-900 mb-2">{SOURCE_LABELS[source] || source}</h1>
      <p className="text-sm text-ink-500 mb-8">{SOURCE_DESCRIPTIONS[source] || ""}</p>

      <FilterBar
        source={source}
        selectedType={type}
        selectedTag={tag}
        onTypeChange={setType}
        onTagChange={setTag}
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-paper-50 rounded-lg p-6 animate-pulse space-y-3">
              <div className="h-6 bg-paper-200 rounded w-1/2" />
              <div className="h-4 bg-paper-200 rounded w-1/3" />
              <div className="h-4 bg-paper-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-ink-300 font-kai text-lg">{EMPTY_TEXT[source] || "此间无踪迹"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
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
          ))}
        </div>
      )}
    </div>
  );
}
