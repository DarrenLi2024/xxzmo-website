"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Props {
  source: string;
  selectedType?: string;
  selectedTag?: string;
  onTypeChange: (type: string) => void;
  onTagChange: (tag: string) => void;
}

export function FilterBar({ selectedType, selectedTag, onTypeChange, onTagChange }: Props) {
  const [tags, setTags] = useState<string[]>([]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      const data: { name: string }[] = await res.json();
      setTags(data.map((t) => t.name));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const types = ["全部", "诗", "词", "曲", "文", "随笔", "日记"];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      {/* 类型筛选 */}
      <div className="flex items-center gap-1 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t === "全部" ? "" : t)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full transition-colors",
              (t === "全部" && !selectedType) || t === selectedType
                ? "bg-accent-bg text-accent font-medium"
                : "text-ink-500 hover:text-ink-900 hover:bg-paper-200"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 分隔 */}
      {tags.length > 0 && <span className="text-ink-200">|</span>}

      {/* 标签筛选 */}
      <div className="flex items-center gap-1 flex-wrap max-w-full overflow-x-auto">
        {tags.slice(0, 12).map((tag) => (
          <button
            key={tag}
            onClick={() => onTagChange(selectedTag === tag ? "" : tag)}
            className={cn(
              "px-2 py-1 text-xs rounded-full transition-colors whitespace-nowrap",
              selectedTag === tag
                ? "bg-accent-bg text-accent font-medium"
                : "text-ink-400 hover:text-ink-700 hover:bg-paper-200"
            )}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
