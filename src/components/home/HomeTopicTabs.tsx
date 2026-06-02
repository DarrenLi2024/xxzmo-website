"use client";

import { useState } from "react";
import { HomeTopicGroup } from "./HomeTopicGroup";
import type { ArticleListItem } from "@/lib/serialize";

interface TopicSection {
  key: string;
  label: string;
  articles: ArticleListItem[];
}

export function HomeTopicTabs({ groups }: { groups: TopicSection[] }) {
  const [active, setActive] = useState(groups[0]?.key || "");

  const activeGroup = groups.find(g => g.key === active) || groups[0];

  return (
    <div>
      {/* 横向滑动胶囊导航 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none -mx-1 px-1">
        {groups.map(g => (
          <button
            key={g.key}
            onClick={() => setActive(g.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm transition-all duration-200 ${
              active === g.key
                ? "bg-ink-900 text-white font-medium shadow-sm"
                : "bg-paper-100 text-ink-500 hover:bg-paper-200 hover:text-ink-700"
            }`}
          >
            {g.label}
            <span className={`ml-1.5 text-xs opacity-50 ${active === g.key ? "" : ""}`}>
              {g.articles.length}
            </span>
          </button>
        ))}
      </div>

      {/* 当前选中分组的卡片 */}
      {activeGroup && <HomeTopicGroup label="" articles={activeGroup.articles} />}
    </div>
  );
}
