"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArticleCard } from "./ArticleCard";
import type { ArticleListItem } from "@/lib/serialize";

export function ArticleFlow() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchArticles = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/articles?page=${pageNum}&pageSize=5`
      );
      const data = await res.json();
      if (pageNum === 1) {
        setArticles(data.articles);
      } else {
        setArticles((prev) => [...prev, ...data.articles]);
      }
      setHasMore(pageNum < data.totalPages);
    } catch (err) {
      console.error("[ArticleFlow] 获取文章失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(1);
  }, [fetchArticles]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) {
      fetchArticles(page);
    }
  }, [page, fetchArticles]);

  if (articles.length === 0 && !loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-300 font-kai text-lg">山房主人尚未挥毫</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {articles.map((article, index) => (
        <div
          key={article.id}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${Math.min(index * 80, 500)}ms`,
            animationDuration: "500ms",
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

      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="space-y-4 py-8">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-paper-50 rounded-lg p-6 animate-pulse space-y-3"
            >
              <div className="h-6 bg-paper-200 rounded w-1/2" />
              <div className="h-4 bg-paper-200 rounded w-1/3" />
              <div className="h-4 bg-paper-200 rounded w-full" />
              <div className="h-4 bg-paper-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!hasMore && articles.length > 0 && (
        <p className="text-center text-sm text-ink-300 py-8 font-kai">
          —— 已显示全部 ——
        </p>
      )}
    </div>
  );
}
