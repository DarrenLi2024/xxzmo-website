"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, Plus, RefreshCw, CheckSquare, XSquare, Loader2, ImageIcon, Square } from "lucide-react";

interface Painting {
  id: string;
  title: string;
  artist: string | null;
  dynasty: string | null;
  url: string;
  thumbnail: string | null;
  description: string | null;
  tags: string[];
  externalId: string;
  externalSource: string;
}

export default function YafenggePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [selectedPaintings, setSelectedPaintings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const fetchPaintings = useCallback(async (query: string, pageNum: number, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        query: query,
        page: pageNum.toString(),
        count: "20",
      });

      const res = await fetch(`/api/admin/paintings/search?${params}`);
      const data = await res.json();

      if (append) {
        setPaintings(prev => {
          const existingIds = new Set(prev.map(p => p.externalId));
          const newPaintings = data.paintings.filter((p: Painting) => !existingIds.has(p.externalId));
          return [...prev, ...newPaintings];
        });
      } else {
        setPaintings(data.paintings || []);
      }

      setHasMore((data.paintings?.length || 0) === 20);
    } catch (error) {
      console.error("获取配图失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      setPage(0);
      fetchPaintings(searchQuery, 0, false);
    }
  }, [fetchPaintings, searchQuery]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPaintings(searchQuery, nextPage, true);
  };

  const toggleSelect = (id: string) => {
    setSelectedPaintings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedPaintings.size === paintings.length) {
      setSelectedPaintings(new Set());
    } else {
      setSelectedPaintings(new Set(paintings.map(p => p.id)));
    }
  };

  const importSelected = async () => {
    if (selectedPaintings.size === 0) return;

    setImporting(true);
    try {
      const selectedData = paintings.filter(p => selectedPaintings.has(p.id));

      const res = await fetch("/api/admin/paintings/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paintings: selectedData }),
      });

      const data = await res.json();

      if (data.success > 0) {
        setImportedCount(data.success);
      }
      if (data.errors && data.errors.length > 0) {
        console.error("导入错误:", data.errors);
      }

      setSelectedPaintings(new Set());

      setTimeout(() => setImportedCount(0), 3000);
    } catch (error) {
      console.error("导入配图失败:", error);
    } finally {
      setImporting(false);
    }
  };

  const handleRandomBrowse = () => {
    setSearchQuery("");
    setPage(0);
    fetchPaintings("", 0, false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-paper-50 to-paper-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink-900">雅风阁</h1>
            <p className="text-muted-foreground mt-1">AI搜图 - 探索古典艺术之美</p>
          </div>
          {importedCount > 0 && (
            <div className="px-4 py-2 bg-green/10 text-green-700 rounded-lg">
              已成功导入 {importedCount} 张配图
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-paper-200 p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="输入关键词搜索古画，如：山水、梅花、羁旅、国风..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-paper-50 border border-paper-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={handleRandomBrowse}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              随机浏览
            </button>
          </div>
        </div>

        {selectedPaintings.size > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-paper-200 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-ink-900 transition-colors"
              >
                {selectedPaintings.size === paintings.length ? <CheckSquare size={18} /> : <Square size={18} />}
                {selectedPaintings.size === paintings.length ? "取消全选" : "全选"}
              </button>
              <span className="text-sm text-muted-foreground">
                已选择 <span className="font-semibold text-primary">{selectedPaintings.size}</span> 张配图
              </span>
            </div>
            <button
              onClick={importSelected}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-green text-white rounded-lg hover:bg-green/90 transition-colors disabled:opacity-50"
            >
              <Plus size={18} />
              {importing ? "导入中..." : `导入到配图库 (${selectedPaintings.size})`}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paintings.map((painting) => (
            <div
              key={painting.id}
              className={`group relative bg-white rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                selectedPaintings.has(painting.id)
                  ? "border-primary shadow-lg"
                  : "border-transparent hover:border-paper-200 hover:shadow-md"
              }`}
              onClick={() => toggleSelect(painting.id)}
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <Image
                  src={painting.thumbnail || painting.url}
                  alt={painting.title}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute top-2 right-2">
                  {selectedPaintings.has(painting.id) ? (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <CheckSquare size={14} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <XSquare size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-ink-900 text-sm truncate">{painting.title}</h3>
                {painting.artist && (
                  <p className="text-xs text-muted-foreground mt-1">{painting.artist}</p>
                )}
                {painting.dynasty && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-amber/10 text-amber-700 rounded-full">
                    {painting.dynasty}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}

        {!loading && hasMore && paintings.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-paper-200 rounded-lg hover:bg-paper-50 transition-colors"
            >
              <RefreshCw size={18} />
              加载更多 (当前 {paintings.length} 幅)
            </button>
          </div>
        )}

        {!loading && paintings.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无配图，点击上方按钮开始探索</p>
          </div>
        )}
      </div>
    </div>
  );
}
