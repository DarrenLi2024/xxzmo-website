"use client";

import { cn } from "@/lib/utils";

interface TypeTabBarProps {
  types: string[];
  selected: string;
  counts?: Record<string, number>;
  onChange: (type: string) => void;
}

export function TypeTabBar({ types, selected, counts, onChange }: TypeTabBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
      {types.map((type) => {
        const count = counts?.[type];
        const isActive = type === selected;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-sm transition-all duration-200",
              "hover:bg-paper-200",
              isActive
                ? "bg-ink-900 text-white font-medium shadow-sm"
                : "bg-paper-100 text-ink-500"
            )}
          >
            {type}
            {count !== undefined && (
              <span className={cn("ml-1 text-xs opacity-60", isActive && "opacity-80")}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
