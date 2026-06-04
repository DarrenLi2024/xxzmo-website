"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ConverterFunction } from "opencc-js";
import { ArticleBody } from "./ArticleBody";
import { ArticleMeta } from "./ArticleMeta";
import { fetchJson } from "@/lib/fetch-json";

interface PinyinMapItem {
  char: string;
  pinyin: string;
}

interface ArticleDetailProps {
  articleId: string;
  title: string;
  subtitle?: string | null;
  author: string;
  dateRaw?: string | null;
  source: string;
  type: string;
  preface?: string | null;
  body: string;
  postscript?: string | null;
  notes?: string | null;
  annotations?: { term: string; explanation: string; sourceTitle?: string; sourceUrl?: string; quote?: string }[] | null;
  translation?: string | null;
  appreciation?: string | null;
  pdfHref?: string;
}

type ScriptMode = "original" | "simplified" | "traditional";

let toSimplified: ConverterFunction | null = null;
let toTraditional: ConverterFunction | null = null;

async function loadConverter(mode: Exclude<ScriptMode, "original">) {
  if (mode === "simplified" && toSimplified) return toSimplified;
  if (mode === "traditional" && toTraditional) return toTraditional;

  const { default: OpenCC } = await import("opencc-js");
  if (mode === "traditional") {
    toTraditional = OpenCC.Converter({ from: "cn", to: "t" });
    return toTraditional;
  }
  toSimplified = OpenCC.Converter({ from: "tw", to: "cn" });
  return toSimplified;
}

function splitParagraphs(text: string) {
  return text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

export function ArticleDetail({
  articleId,
  title,
  subtitle,
  author,
  dateRaw,
  source,
  type,
  preface,
  body,
  postscript,
  notes,
  annotations,
  translation,
  appreciation,
  pdfHref,
}: ArticleDetailProps) {
  const [showPinyin, setShowPinyin] = useState(false);
  const [pinyinData, setPinyinData] = useState<PinyinMapItem[]>([]);
  const [hasPinyin, setHasPinyin] = useState(false);
  const [scriptMode, setScriptMode] = useState<ScriptMode>("original");
  const [scriptConverter, setScriptConverter] = useState<ConverterFunction | null>(null);
  const [isScriptConverting, setIsScriptConverting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("showPinyin");
      if (saved !== null) setShowPinyin(saved === "true");
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("showPinyin", showPinyin.toString()); } catch {}
  }, [showPinyin]);

  useEffect(() => {
    const load = async () => {
      try {
        let data = await fetchJson<any>(`/api/articles/pinyin?articleId=${articleId}`);
        if (!data.success && data.message === "未生成拼音") {
          data = await fetchJson<any>("/api/articles/pinyin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId }) });
        }
        if (data.success && (data.data?.bodyMap || data.data?.pinyinMap)) {
          const legacyTitleLength = data.data.title?.length || 0;
          setPinyinData(data.data.bodyMap || data.data.pinyinMap.slice(legacyTitleLength));
          setHasPinyin(true);
        }
      } catch {}
    };
    load();
  }, [articleId]);

  function convertText(text?: string | null) {
    if (!text || scriptMode === "original" || !scriptConverter) return text;
    return scriptConverter(text);
  }

  const visibleBody = convertText(body) || "";
  const visibleTitle = convertText(title) || "";
  const visibleSubtitle = convertText(subtitle);
  const visibleAuthor = convertText(author) || "";
  const visibleType = convertText(type) || "";
  const visibleDateRaw = convertText(dateRaw);
  const visibleBodyChars = Array.from(visibleBody);
  const visiblePinyinData = pinyinData.map((item, index) => ({
    ...item,
    char: visibleBodyChars[index] || item.char,
  }));

  const visibleAnnotations = annotations?.map((annotation) => ({
    ...annotation,
    term: convertText(annotation.term) || "",
    explanation: convertText(annotation.explanation) || "",
    sourceTitle: convertText(annotation.sourceTitle),
    quote: convertText(annotation.quote),
  }));

  // 根据 scriptMode 推导当前 lang 属性 (简/繁)
  const htmlLang = scriptMode === "traditional" ? "zh-Hant" : "zh-Hans";

  // 拼音注音的 lang 属性
  const pinyinLang = "zh-Latn";

  async function setDisplayScript(nextMode: Exclude<ScriptMode, "original">) {
    if (scriptMode === nextMode) return;
    setIsScriptConverting(true);
    try {
      const converter = await loadConverter(nextMode);
      setScriptConverter(() => converter);
      setScriptMode(nextMode);
      // 同步页面级 lang 属性
      document.documentElement.setAttribute("lang", nextMode === "traditional" ? "zh-Hant" : "zh-Hans");
    } finally {
      setIsScriptConverting(false);
    }
  }

  return (
    <>
      <header className="mb-8 border-b border-ink-900 pb-4">
        <hgroup>
          <h1 className="text-2xl md:text-3xl font-serif text-ink-900 font-medium tracking-wide mb-2">
            {visibleTitle}
          </h1>
          {visibleSubtitle && (
            <p role="doc-subtitle" className="text-lg font-kai text-ink-500 mb-2">{visibleSubtitle}</p>
          )}
        </hgroup>
        <ArticleMeta
          type={visibleType}
          author={visibleAuthor}
          dateRaw={visibleDateRaw}
        />
      </header>

      <ArticleBody
        articleId={articleId} source={source} type={type}
        preface={convertText(preface)} body={visibleBody} postscript={convertText(postscript)} notes={convertText(notes)}
        pinyinData={visiblePinyinData} showPinyin={showPinyin}
      />

      {/* 操作栏：拼音 + 简繁 + PDF */}
      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-paper-200">
        {hasPinyin && (
          <button onClick={() => setShowPinyin(!showPinyin)}
            aria-pressed={showPinyin}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              showPinyin ? "border-accent/40 bg-accent/10 text-accent" : "border-paper-200 text-ink-500 hover:bg-paper-100"}`}>
            {showPinyin ? "隐藏拼音" : "显示拼音"}
          </button>
        )}
        <div className="inline-flex rounded border border-paper-200 overflow-hidden" aria-label="简繁切换">
          <button
            type="button"
            onClick={() => setDisplayScript("simplified")}
            disabled={isScriptConverting}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              scriptMode === "simplified" ? "bg-accent/10 text-accent" : "text-ink-500 hover:bg-paper-100"} disabled:opacity-50`}
            aria-pressed={scriptMode === "simplified"}
          >
            简体
          </button>
          <button
            type="button"
            onClick={() => setDisplayScript("traditional")}
            disabled={isScriptConverting}
            className={`px-3 py-1.5 text-xs font-medium border-l border-paper-200 transition-colors ${
              scriptMode === "traditional" ? "bg-accent/10 text-accent" : "text-ink-500 hover:bg-paper-100"} disabled:opacity-50`}
            aria-pressed={scriptMode === "traditional"}
          >
            繁体
          </button>
        </div>
        {isScriptConverting && <span className="text-xs text-ink-400">转换中...</span>}
        {pdfHref && (
          <Link href={pdfHref} target="_blank" className="px-3 py-1.5 text-xs border border-paper-200 text-ink-500 rounded hover:bg-paper-100 transition-colors no-underline">
            查看PDF
          </Link>
        )}
      </div>

      {/* 注释 - PDF 预览式垂直排布 */}
      {visibleAnnotations && visibleAnnotations.length > 0 && (
        <section className="mt-10 pt-6 border-t border-paper-200" lang={htmlLang}>
          <h2 className="text-lg font-serif text-ink-900 font-medium mb-4">注释</h2>
          <ol className="space-y-3 text-sm md:text-base text-ink-700">
            {visibleAnnotations.map((a, i) => (
              <li key={i} className="annotation-item">
                <span>{i + 1}. </span>
                <span>{a.term}</span>
                <span>：</span>
                <span className="annotation-explanation">{a.explanation}</span>
                {(a.sourceTitle || a.sourceUrl || a.quote) && (
                  <span className="block text-xs text-ink-400 mt-1 ml-5">
                    {a.quote ? `据「${a.quote.slice(0, 60)}${a.quote.length > 60 ? "..." : ""}」` : "出处"}
                    {a.sourceTitle ? ` · ${a.sourceTitle}` : ""}
                    {a.sourceUrl && <><span> · </span><Link href={a.sourceUrl} target="_blank" className="text-accent no-underline">查看来源</Link></>}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 译文 */}
      {translation && (
        <section className="mt-10 pt-6 border-t border-paper-200" lang={htmlLang}>
          <h2 className="text-lg font-serif text-ink-900 font-medium mb-4">译文</h2>
          <div className="indented-text text-sm md:text-base text-ink-700">
            {splitParagraphs(convertText(translation) || "").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* 赏析 */}
      {appreciation && (
        <section className="mt-10 pt-6 border-t border-paper-200" lang={htmlLang}>
          <h2 className="text-lg font-serif text-ink-900 font-medium mb-4">赏析</h2>
          <div className="indented-text text-sm md:text-base text-ink-700">
            {splitParagraphs(convertText(appreciation) || "").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
