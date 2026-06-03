"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Tag, Hash, X } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface ArticleResult {
  id: string;
  slug: string;
  title: string;
  author: string;
  source: string;
  type: string;
  dateRaw: string | null;
  body: string;
  tags: string[];
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-paper-50 border border-paper-200 rounded-lg p-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <div className="h-5 w-32 bg-paper-200 rounded animate-pulse" />
            <div className="h-4 w-12 bg-paper-200 rounded animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-paper-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-paper-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-paper-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag") || "";
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(initialTag);
  const [results, setResults] = useState<ArticleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string, tag: string) => {
    const hasQuery = q.trim();
    const hasTag = tag.trim();
    
    if (!hasQuery && !hasTag) {
      setResults([]);
      setSearched(false);
      return;
    }
    
    setLoading(true);
    setSearched(true);
    try {
      let url = "/api/search?";
      const params = new URLSearchParams();
      if (hasQuery) params.append("q", q);
      if (hasTag) params.append("tag", tag);
      url += params.toString();
      
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.articles);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, activeTag), 300);
    return () => clearTimeout(timer);
  }, [query, activeTag, doSearch]);

  const clearTag = () => {
    setActiveTag("");
    setQuery("");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif text-ink-900 mb-8">搜索</h1>

      {activeTag && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">
                标签筛选：
              </span>
              <span className="text-sm text-amber-900 font-bold">
                {activeTag}
              </span>
              <span className="text-xs text-amber-600">
                （{results.length} 篇相关诗文）
              </span>
            </div>
            <button
              onClick={clearTag}
              className="text-amber-600 hover:text-amber-800 transition-colors"
              title="清除筛选"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {!activeTag && (
        <div className="relative mb-8">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题、正文、标签..."
            className="w-full pl-10 pr-4 py-3 rounded-md border border-paper-300 bg-transparent text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 focus:shadow-sm transition-all"
            autoFocus
          />
        </div>
      )}

      {loading && <SearchSkeleton />}

      {!loading && searched && results.length > 0 && (
        <>
          {!activeTag && (
            <p className="text-sm text-ink-500 mb-4">找到 {results.length} 篇</p>
          )}
          <div className="space-y-3">
            {results.map((article) => (
              <Link
                key={article.id}
                href={`/${article.source === "jigu" ? "jigu" : "chuli"}/${article.slug}`}
                className="block bg-paper-50 border border-paper-200 rounded-lg p-4 no-underline hover:shadow-md transition-shadow"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-base font-medium text-ink-900">{article.title}</h3>
                  <span className="text-xs text-ink-400">{article.type}</span>
                </div>
                <p className="text-xs text-ink-500 mb-1.5">{article.author} · {article.dateRaw}</p>
                <p className="text-sm text-ink-600 leading-relaxed line-clamp-2">{article.body}</p>
                {!activeTag && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {article.tags.map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-paper-200 rounded-full text-ink-500">{tag}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="py-16 text-center">
          <Hash size={36} className="text-ink-200 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-ink-300 font-kai text-lg">此间无踪迹</p>
        </div>
      )}

      {!searched && !loading && (
        <div className="py-16 text-center">
          <Search size={36} className="text-ink-200 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-ink-300 font-kai text-base">输入关键词开始搜索</p>
        </div>
      )}
    </div>
  );
}
