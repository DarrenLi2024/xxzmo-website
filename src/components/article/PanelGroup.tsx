"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Panel {
  key: string;
  label: string;
  content: unknown;
}

interface Props {
  annotations?: {
    term: string;
    explanation: string;
    sourceTitle?: string;
    sourceUrl?: string;
    quote?: string;
    confidence?: number;
  }[] | null;
  translation?: string | null;
  appreciation?: string | null;
  hasPinyin?: boolean;
  onPinyinToggle?: (show: boolean) => void;
  showPinyin?: boolean;
  pdfHref?: string;
}

export function PanelGroup({ annotations, translation, appreciation, hasPinyin = false, onPinyinToggle, showPinyin = false, pdfHref }: Props) {
  const panels: Panel[] = [
    { key: "annotations", label: "注释", content: annotations },
    { key: "translation", label: "译文", content: translation },
    { key: "appreciation", label: "赏析", content: appreciation },
  ].filter((p) => {
    if (p.content == null) return false;
    if (Array.isArray(p.content) && p.content.length === 0) return false;
    if (typeof p.content === "string" && p.content.trim() === "") return false;
    return true;
  });

  const [active, setActive] = useState(panels[0]?.key ?? null);

  if (panels.length === 0 && !hasPinyin && !pdfHref) return null;

  return (
    <div className="my-8">
      <div className="flex flex-wrap gap-1 border-b border-paper-200 mb-4">
          {panels.map((panel) => (
            <button
              key={panel.key}
              onClick={() => setActive(panel.key)}
              className={cn(
                "px-4 py-2 text-sm transition-colors relative -mb-px",
                active === panel.key
                  ? "text-ink-900 font-medium border-b-2 border-accent"
                  : "text-ink-300 hover:text-ink-700"
              )}
            >
              {panel.label}
            </button>
          ))}
        {hasPinyin && onPinyinToggle && (
          <button
            type="button"
            onClick={() => onPinyinToggle(!showPinyin)}
            className={cn(
              "px-4 py-2 text-sm transition-colors relative -mb-px",
              showPinyin
                ? "text-ink-900 font-medium border-b-2 border-accent"
                : "text-ink-300 hover:text-ink-700"
            )}
          >
            拼音
          </button>
        )}
        {pdfHref && (
          <Link
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm transition-colors relative -mb-px text-ink-300 hover:text-ink-700 no-underline"
          >
            查看PDF
          </Link>
        )}
      </div>

      <div className="bg-paper-50 rounded-lg border border-paper-200 p-6 md:p-8">
        {active === "annotations" && annotations && (
          <ol className="text-sm md:text-base text-ink-700 space-y-3">
            {annotations.map((a, i) => (
              <li key={i} className="annotation-item">
                <span>{i + 1}. </span>
                <span>{a.term}</span>
                <span>：</span>
                <span className="annotation-explanation">{a.explanation}</span>
                {(a.sourceTitle || a.sourceUrl || a.quote) && (
                  <span className="block text-xs text-ink-400 mt-1 ml-5">
                    {a.quote ? `据「${a.quote.slice(0, 60)}${a.quote.length > 60 ? "..." : ""}」` : "出处"}
                    {a.sourceTitle ? ` · ${a.sourceTitle}` : ""}
                    {a.sourceUrl ? (
                      <>
                        {" · "}
                        <Link href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent no-underline">
                          查看来源
                        </Link>
                      </>
                    ) : null}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
        {active === "translation" && translation && (
          <div className="indented-text text-sm md:text-base text-ink-700">
            {splitParagraphs(translation).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
        {active === "appreciation" && appreciation && (
          <div className="indented-text text-sm md:text-base text-ink-700">
            {splitParagraphs(appreciation).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
        {active && !panels.find((p) => p.key === active)?.content && (
          <p className="text-sm text-ink-300 text-center py-4">暂无</p>
        )}
        {!active && panels.length === 0 && hasPinyin && (
          <p className="text-sm text-ink-300 text-center py-4">暂无注释内容</p>
        )}
      </div>
    </div>
  );
}

function splitParagraphs(text: string) {
  return text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}
