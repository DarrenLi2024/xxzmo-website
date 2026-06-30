"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { X, Quote } from "lucide-react";

interface DailyQuoteModalProps {
  content: string;
  sourceLabel: string;
  sourceNote: string;
}

export function DailyQuoteModal({ content, sourceLabel, sourceNote }: DailyQuoteModalProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-20 h-20 mt-8 rounded-full border-2 border-paper-300 hover:border-ink-300 transition-all duration-300 hover:scale-105 bg-paper-200 cursor-pointer"
        aria-label="查看名句详情"
      >
        <Quote size={24} className="text-ink-400" />
      </button>

      {open && (
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
            <p className="text-xs text-ink-300 mb-8">{sourceNote}</p>

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
