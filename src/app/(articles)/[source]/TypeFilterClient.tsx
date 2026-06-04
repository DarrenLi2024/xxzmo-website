"use client";

import { useState } from "react";
import { TypeTabBar } from "@/components/common/TypeTabBar";
import { ArticleCard } from "@/components/article/ArticleCard";
import type { ArticleListItem } from "@/lib/serialize";

interface Props {
  types: string[];
  typeCounts: Record<string, number>;
  articles: ArticleListItem[];
}

export function TypeFilterClient({ types, typeCounts, articles }: Props) {
  const [selectedType, setSelectedType] = useState("全部");

  const filtered =
    selectedType === "全部" ? articles : articles.filter((a) => (a.type || "诗") === selectedType);

  return (
    <>
      <TypeTabBar
        types={types}
        selected={selectedType}
        counts={typeCounts}
        onChange={setSelectedType}
      />
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
    </>
  );
}