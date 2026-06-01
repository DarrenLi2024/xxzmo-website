"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useDailyQuote } from "@/hooks/useApi";
import { Card, Body, Caption } from "@/components/design-system";

interface DailyQuote {
  content: string;
  source: string;
  sourceRef?: string;
  dateKey: string;
}

export function DailyQuoteSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: quote } = useDailyQuote() as { data: DailyQuote | undefined };

  const close = useCallback(() => setModalOpen(false), []);

  const content = quote?.content || "待山房主人挥毫...";
  const sourceLabel =
    quote?.source === "from_collection"
      ? "樗栎集"
      : quote?.source === "ai_generated"
        ? "AI 生成"
        : "";

  return (
    <>
      <section className="text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <Card variant="elevated" className="max-w-lg mx-auto p-8">
          <Body className="font-kai text-lg text-ink-700 leading-loose">
            &ldquo;{content}&rdquo;
          </Body>
          {sourceLabel && (
            <Caption className="mt-4">
              —— {sourceLabel}
            </Caption>
          )}
        </Card>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-block w-20 h-20 mt-8 rounded-full border-2 border-paper-300 hover:border-ink-300 transition-all duration-300 hover:scale-105 bg-paper-200 cursor-pointer animate-pulse-soft"
          aria-label="查看名句"
        />
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 backdrop-blur-sm animate-fade-in"
          onClick={close}
        >
          <div
            className="relative bg-white rounded border border-paper-200 shadow-md p-10 max-w-md w-full mx-4 text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 text-ink-300 hover:text-ink-700 transition-colors"
            >
              <X size={18} />
            </button>

            <Body className="font-kai text-xl text-ink-700 leading-loose mb-4">
              &ldquo;{content}&rdquo;
            </Body>
            <Caption className="mb-2">
              {sourceLabel && `出自：${sourceLabel}`}
            </Caption>
            <Caption className="text-ink-300 mb-8">
              {quote?.source === "from_collection" ? "来源：樗栎集" : "来源：AI 生成"}
            </Caption>

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
