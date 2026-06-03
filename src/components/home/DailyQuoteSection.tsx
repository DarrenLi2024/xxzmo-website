"use client";

import { useState, useCallback } from "react";
import { X, Quote } from "lucide-react";
import Link from "next/link";
import { useDailyQuote } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyQuote {
  content: string;
  source: string;
  sourceRef?: string;
  dateKey: string;
}

export function DailyQuoteSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: quote, isLoading, isError } = useDailyQuote() as {
    data: DailyQuote | undefined;
    isLoading: boolean;
    isError: boolean;
  };

  const close = useCallback(() => setModalOpen(false), []);

  // Loading state
  if (isLoading) {
    return (
      <section className="text-center">
        <div className="max-w-lg mx-auto p-8">
          <Skeleton className="h-8 w-3/4 mx-auto rounded animate-pulse" />
          <Skeleton className="h-4 w-1/2 mx-auto mt-4 rounded animate-pulse" />
        </div>
      </section>
    );
  }

  // Error state
  if (isError) {
    return (
      <section className="text-center">
        <div className="max-w-lg mx-auto p-8">
          <Quote size={24} className="text-ink-200 mx-auto mb-3" />
          <p className="text-ink-300 font-kai text-base">名言暂未就绪</p>
          <p className="text-xs text-ink-300 mt-1">山房正在准备中，稍后再来</p>
        </div>
      </section>
    );
  }

  const content = quote?.content || "";
  if (!content) {
    return (
      <section className="text-center">
        <div className="max-w-lg mx-auto p-8">
          <Quote size={24} className="text-ink-200 mx-auto mb-3" />
          <p className="text-ink-300 font-kai text-base">待山房主人挥毫...</p>
        </div>
      </section>
    );
  }

  const sourceLabel =
    quote?.source === "from_collection"
      ? "樗栎集"
      : quote?.source === "ai_generated"
        ? "AI 生成"
        : "";

  return (
    <>
      <section className="text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="max-w-lg mx-auto p-8 bg-white rounded-2xl border border-paper-200 shadow-sm">
          <p className="font-kai text-lg text-ink-700 leading-loose">
            &ldquo;{content}&rdquo;
          </p>
          {sourceLabel && (
            <p className="text-xs text-ink-400 mt-4">
              —— {sourceLabel}
            </p>
          )}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center w-20 h-20 mt-8 rounded-full border-2 border-paper-300 hover:border-ink-300 transition-all duration-300 hover:scale-105 bg-paper-200 cursor-pointer"
          aria-label="查看名句详情"
        >
          <Quote size={24} className="text-ink-400" />
        </button>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 backdrop-blur-sm animate-fade-in"
          onClick={close}
        >
          <div
            className="relative bg-white rounded-lg border border-paper-200 shadow-lg p-10 max-w-md w-full mx-4 text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 text-ink-300 hover:text-ink-700 transition-colors"
            >
              <X size={18} />
            </button>

            <p className="font-kai text-xl text-ink-700 leading-loose mb-4">
              &ldquo;{content}&rdquo;
            </p>
            <p className="text-xs text-ink-400 mb-2">
              {sourceLabel && `出自：${sourceLabel}`}
            </p>
            <p className="text-xs text-ink-300 mb-8">
              {quote?.source === "from_collection" ? "来源：樗栎集" : "AI 生成"}
            </p>

            <Link
              href="/about"
              onClick={close}
              className="inline-block px-6 py-2.5 rounded-md bg-accent text-white text-sm no-underline hover:bg-accent-dim transition-colors"
            >
              进入山房
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
