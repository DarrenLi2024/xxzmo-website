"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import type { ConverterFunction } from "opencc-js";
import { ArticleBody } from "./ArticleBody";
import { ArticleExportControls, type ExportOptions, type ExportScriptMode } from "./ArticleExportControls";
import { ArticleMeta } from "./ArticleMeta";

interface PinyinMapItem {
  char: string;
  pinyin: string;
}

interface Props {
  article: {
    id: string;
    title: string;
    source: string;
    type: string;
    author: string;
    dateRaw: string | null;
    preface: string | null;
    body: string;
    postscript: string | null;
    notes: string | null;
    translation: string | null;
    appreciation: string | null;
  };
  annotations: { term: string; explanation: string }[] | null;
}

let toSimplified: ConverterFunction | null = null;
let toTraditional: ConverterFunction | null = null;

async function loadConverter(mode: Exclude<ExportScriptMode, "original">) {
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

export function ArticlePdfPreview({ article, annotations }: Props) {
  const [pinyinData, setPinyinData] = useState<PinyinMapItem[]>([]);
  const [hasPinyin, setHasPinyin] = useState(false);
  const [scriptConverter, setScriptConverter] = useState<ConverterFunction | null>(null);
  const [isScriptConverting, setIsScriptConverting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    annotations: !!annotations?.length,
    translation: !!article.translation,
    appreciation: !!article.appreciation,
    pinyin: false,
    fontScale: 1,
    scriptMode: "original",
  });

  useEffect(() => {
    const loadPinyin = async () => {
      try {
        let res = await fetch(`/api/articles/pinyin?articleId=${article.id}`);
        let data = await res.json();

        if (!data.success && data.message === "未生成拼音") {
          res = await fetch("/api/articles/pinyin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleId: article.id }),
          });
          data = await res.json();
        }

        if (data.success && (data.data?.bodyMap || data.data?.pinyinMap)) {
          const legacyTitleLength = data.data.title?.length || 0;
          setPinyinData(data.data.bodyMap || data.data.pinyinMap.slice(legacyTitleLength));
          setHasPinyin(true);
        }
      } catch (error) {
        console.error("加载拼音失败:", error);
      }
    };

    loadPinyin();
  }, [article.id]);

  function convertText(text?: string | null) {
    if (!text || options.scriptMode === "original" || !scriptConverter) return text;
    return scriptConverter(text);
  }

  async function setDisplayScript(mode: ExportScriptMode) {
    if (options.scriptMode === mode) return;
    if (mode === "original") {
      setOptions((current) => ({ ...current, scriptMode: mode }));
      setScriptConverter(null);
      return;
    }
    setIsScriptConverting(true);
    try {
      const converter = await loadConverter(mode);
      setScriptConverter(() => converter);
      setOptions((current) => ({ ...current, scriptMode: mode }));
    } finally {
      setIsScriptConverting(false);
    }
  }

  const visibleTitle = convertText(article.title) || "";
  const visibleAuthor = convertText(article.author) || "";
  const visibleDateRaw = convertText(article.dateRaw);
  const visibleType = convertText(article.type) || "";
  const visibleBody = convertText(article.body) || "";
  const visibleBodyChars = Array.from(visibleBody);
  const visiblePinyinData = pinyinData.map((item, index) => ({
    ...item,
    char: visibleBodyChars[index] || item.char,
  }));
  const visibleAnnotations = annotations?.map((item) => ({
    term: convertText(item.term) || "",
    explanation: convertText(item.explanation) || "",
  }));
  const collectionName = article.source === "jigu" ? "辑古录" : "樗栎集";

  const handlePrint = () => {
    flushSync(() => setOptions((current) => ({ ...current })));
    window.print();
  };

  const printMarginStyle = buildPrintMarginStyle(
    convertText(`PDF来自《闲心子墨·${collectionName}》`) || "",
    `《${visibleTitle}》`,
    convertText("樗栎本无用，天地一散人") || ""
  );

  return (
    <main
      className="pdf-preview-page min-h-screen bg-paper-100 px-4 py-8"
      style={{ "--pdf-font-scale": options.fontScale } as CSSProperties}
    >
      <style media="print" dangerouslySetInnerHTML={{ __html: printMarginStyle }} />

      <div className="mx-auto max-w-4xl">
        <ArticleExportControls
          value={options}
          hasAnnotations={!!annotations?.length}
          hasTranslation={!!article.translation}
          hasAppreciation={!!article.appreciation}
          hasPinyin={hasPinyin}
          isScriptConverting={isScriptConverting}
          onChange={setOptions}
          onScriptModeChange={setDisplayScript}
          onPrint={handlePrint}
        />

        <article className="pdf-preview-sheet mx-auto bg-white px-10 py-12 shadow-sm ring-1 ring-paper-200">
          <header className="mb-8 border-b border-ink-900 pb-4">
            <h1 className="text-3xl font-serif text-ink-900 font-medium tracking-wide mb-2">
              {visibleTitle}
            </h1>
            <ArticleMeta type={visibleType} author={visibleAuthor} dateRaw={visibleDateRaw} />
          </header>

          <ArticleBody
            articleId={article.id}
            source={article.source}
            type={article.type}
            preface={convertText(article.preface)}
            body={visibleBody}
            postscript={convertText(article.postscript)}
            notes={convertText(article.notes)}
            pinyinData={visiblePinyinData}
            showPinyin={options.pinyin}
          />

          <div className="pdf-print-sections pdf-preview-sections">
            {options.annotations && visibleAnnotations && visibleAnnotations.length > 0 && (
              <section className="pdf-print-section">
                <h2>{convertText("注释")}</h2>
                <ol>
                  {visibleAnnotations.map((item, index) => (
                    <li key={index} className="annotation-item">
                      <span>{index + 1}. {item.term}：</span>
                      <span className="annotation-explanation">{item.explanation}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {options.translation && article.translation && (
              <section className="pdf-print-section">
                <h2>{convertText("译文")}</h2>
                <div className="indented-text">
                  {splitParagraphs(convertText(article.translation) || "").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            )}
            {options.appreciation && article.appreciation && (
              <section className="pdf-print-section">
                <h2>{convertText("赏析")}</h2>
                <div className="indented-text">
                  {splitParagraphs(convertText(article.appreciation) || "").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}

function buildPrintMarginStyle(header: string, footerTitle: string, footerSignature: string) {
  return `
@page {
  size: A4;
  margin: 22mm 16mm 20mm;

  @top-right {
    content: "${cssString(header)}";
    color: #333;
    font-size: 9pt;
    line-height: 1.4;
    vertical-align: bottom;
    padding-bottom: 4mm;
  }

  @bottom-left {
    content: "${cssString(footerTitle)}";
    border-top: 0.25mm solid #ddd;
    color: #555;
    font-size: 9pt;
    line-height: 1.4;
    vertical-align: top;
    padding-top: 3mm;
  }

  @bottom-center {
    content: "${cssString(footerSignature)}";
    border-top: 0.25mm solid #ddd;
    color: #555;
    font-size: 9pt;
    line-height: 1.4;
    vertical-align: top;
    padding-top: 3mm;
  }

  @bottom-right {
    content: "第 " counter(page) " 页";
    border-top: 0.25mm solid #ddd;
    color: #555;
    font-size: 9pt;
    line-height: 1.4;
    vertical-align: top;
    padding-top: 3mm;
  }
}`;
}

function cssString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\A ");
}

function splitParagraphs(text: string) {
  return text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}
