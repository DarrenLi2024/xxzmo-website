"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, AlertTriangle, FileText, Tag, AlertCircle, Copy, ExternalLink, Trash2, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

const EXAMPLE = `秋日午后口占一首

秋风起兮白云飞，
草木黄落兮雁南归。
兰有秀兮菊有芳，
怀佳人兮不能忘。

夜读偶得

更深人静一灯孤，
黄卷青灯伴老夫。
读到会心微笑处，
不知明月上庭梧。

浣溪沙·春日

一曲新词酒一杯，
去年天气旧亭台。
夕阳西下几时回？

无可奈何花落去，
似曾相识燕归来。
小园香径独徘徊。`;

interface ParsedArticle {
  id: string;
  title: string;
  body: string;
  type: string;
  subType?: string;
  preface?: string;
  postscript?: string;
  confidence: number;
  classificationReasons?: string[];
  selected: boolean;
}

interface DuplicateItem {
  original: string;
  duplicate: string;
  type: "exact" | "similar";
  similarity: number;
  diffSummary: string;
}

export default function AdminXianyinPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsingMode, setParsingMode] = useState<"rule" | "ai" | "write">("rule");
  const [articles, setArticles] = useState<ParsedArticle[] | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateItem[] | null>(null);
  const [error, setError] = useState("");
  const [separator, setSeparator] = useState("");
  const [defaultType, setDefaultType] = useState("诗");
  const [writeMode, setWriteMode] = useState("generate");
  const [writeType, setWriteType] = useState("诗");
  const [styleHint, setStyleHint] = useState("");
  const [writeResult, setWriteResult] = useState<string | null>(null);
  const [writeProvider, setWriteProvider] = useState("");
  const [writeLoading, setWriteLoading] = useState(false);

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    setError("");
    setArticles(null);
    setDuplicates(null);

    try {
      const apiUrl = parsingMode === "ai" 
        ? "/api/admin/xianyin/ai-parse" 
        : "/api/admin/xianyin/parse";
      
      const body = parsingMode === "ai"
        ? { text: text.trim() }
        : { text: text.trim(), separator, defaultType };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles.map((a: ParsedArticle) => ({ ...a, selected: true })));
        setDuplicates(data.duplicates || []);
        setText("");
      } else {
        const data = await res.json();
        setError(data.error || "解析失败");
        toastError(data.error || "解析失败");
      }
    } catch {
      setError("网络错误，请重试");
      toastError("网络错误，请重试");
    } finally {
      setParsing(false);
    }
  }

  async function handleWrite() {
    if (!text.trim()) return;
    setWriteLoading(true);
    setWriteResult(null);
    setWriteProvider("");
    setError("");

    try {
      const res = await fetch("/api/admin/xianyin/ai-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: writeMode,
          type: writeType,
          input: text.trim(),
          styleHint: styleHint.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWriteResult(data.output);
        setWriteProvider(`${data.provider} (${data.model})`);
      } else {
        const data = await res.json();
        setError(data.error || "创作失败");
        toastError(data.error || "创作失败");
      }
    } catch {
      setError("网络错误，请重试");
      toastError("网络错误，请重试");
    } finally {
      setWriteLoading(false);
    }
  }

  function toggleSelectAll() {
    if (!articles) return;
    const allSelected = articles.every(a => a.selected);
    setArticles(articles.map(a => ({ ...a, selected: !allSelected })));
  }

  function toggleSelect(id: string) {
    if (!articles) return;
    setArticles(articles.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  }

  function removeArticle(id: string) {
    if (!articles) return;
    setArticles(articles.filter(a => a.id !== id));
  }

  function updateArticle(id: string, field: 'title' | 'body' | 'preface' | 'postscript', value: string) {
    if (!articles) return;
    setArticles(articles.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  async function handleImport() {
    const selectedArticles = articles?.filter(a => a.selected);
    if (!selectedArticles || selectedArticles.length === 0) {
      toastError("请至少选择一篇文章");
      return;
    }

    setParsing(true);
    try {
      const res = await fetch("/api/admin/xianyin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: selectedArticles.map(a => ({
            title: a.title,
            body: a.body,
            type: a.type,
            subType: a.subType,
            preface: a.preface,
            postscript: a.postscript,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        success(`成功导入 ${data.count} 篇文章至樗栎集`);
        setArticles(null);
        setDuplicates(null);
        router.push("/admin/chuli");
      } else {
        const data = await res.json();
        toastError(data.error || "导入失败");
      }
    } catch {
      toastError("网络错误，请重试");
    } finally {
      setParsing(false);
    }
  }

  function getTypeBadge(type: string, subType?: string): string {
    if (subType && subType !== type) {
      return `${type}·${subType}`;
    }
    return type;
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return "text-green";
    if (confidence >= 0.7) return "text-amber";
    return "text-ink-400";
  }

  const selectedCount = articles?.filter(a => a.selected).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-serif text-ink-900">闲吟录</h2>
          <p className="text-sm text-ink-500 mt-1">智能解析与分篇，确认后同步至樗栎集</p>
        </div>
        <button
          onClick={() => router.push("/admin/chuli")}
          className="px-4 py-2 border border-paper-300 text-ink-700 rounded-md text-sm hover:bg-paper-200 transition-colors"
        >
          查看樗栎集
        </button>
      </div>

      {/* 输入区域 */}
      <div className="bg-paper-50 border border-paper-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm text-ink-700 mb-2">
            粘贴待解析的诗文 — 选择分篇模式进行智能解析
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            rows={12}
            disabled={parsing}
            className="w-full px-4 py-3 rounded-md border border-paper-300 bg-white text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 transition-all font-serif leading-relaxed disabled:opacity-50"
          />
        </div>

        <details className="text-sm">
          <summary className="text-ink-500 cursor-pointer hover:text-ink-700">分篇模式说明</summary>
          <div className="mt-2 p-4 bg-paper-100 rounded-md text-xs text-ink-500 space-y-2 font-mono whitespace-pre-wrap">
            <div className="font-medium text-ink-700">【规则分篇】基于标题模式、韵律特征、序号等规则进行拆分</div>
            <div className="text-ink-400">适用于：格式规范、标题明确的诗文</div>
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-medium text-blue-700">【AI 智能分篇】(推荐)</div>
              <div className="text-blue-600">基于语义理解进行智能拆分，序和跋将作为元数据附在对应文章</div>
              <div className="text-blue-500 mt-1">适用于：复杂结构、无标记标题、序跋混杂的文本</div>
            </div>
          </div>
        </details>

        {/* 功能模式选择 */}
        <div className="flex items-center gap-3 p-3 bg-accent-bg rounded-md border border-accent/20">
          <span className="text-xs text-accent font-medium">功能模式：</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setParsingMode("rule")}
              disabled={parsing}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
                parsingMode === "rule"
                  ? "bg-ink-700 text-white"
                  : "bg-paper-200 text-ink-600 hover:bg-paper-300"
              } disabled:opacity-50`}
            >
              智能分篇
            </button>
            <button
              onClick={() => setParsingMode("ai")}
              disabled={parsing}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
                parsingMode === "ai"
                  ? "bg-accent text-white"
                  : "bg-paper-200 text-ink-600 hover:bg-paper-300"
              } disabled:opacity-50 flex items-center gap-1`}
            >
              <Sparkles size={12} /> AI 智能分篇
            </button>
            <button
              onClick={() => setParsingMode("write")}
              disabled={parsing}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
                parsingMode === "write"
                  ? "bg-accent text-white"
                  : "bg-paper-200 text-ink-600 hover:bg-paper-300"
              } disabled:opacity-50 flex items-center gap-1`}
            >
              <Sparkles size={12} /> AI 创作辅助
            </button>
          </div>
        </div>

        {parsingMode === "write" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-ink-400 block mb-1">创作模式</label>
                <select
                  value={writeMode}
                  onChange={(e) => setWriteMode(e.target.value)}
                  className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-accent"
                >
                  <option value="generate">✨ AI 生成 · 根据想法生成完整诗文</option>
                  <option value="rewrite">🔄 改写 · 用不同风格重写</option>
                  <option value="expand">📐 扩写 · 将短句扩展为篇章</option>
                  <option value="continue">➡️ 续写 · 根据开头续写后续</option>
                  <option value="polish">💎 润色 · 优化用词和韵律</option>
                  <option value="tuijiao">🔍 推敲 · 逐字推敲给出替换建议</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-400 block mb-1">目标体裁</label>
                <select
                  value={writeType}
                  onChange={(e) => setWriteType(e.target.value)}
                  className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-accent"
                >
                  {["诗", "词", "文", "赋", "随笔", "日记", "对联"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-400 block mb-1">风格偏好（可选）</label>
                <input
                  type="text"
                  value={styleHint}
                  onChange={(e) => setStyleHint(e.target.value)}
                  placeholder="如：豪放、婉约、田园、咏史..."
                  className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <button
              onClick={handleWrite}
              disabled={writeLoading || !text.trim()}
              className="w-full px-6 py-3 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {writeLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> AI 创作中...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> 开始 AI 创作
                </>
              )}
            </button>

            {writeResult && (
              <div className="mt-4 p-6 bg-white rounded-lg border-2 border-accent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-400 flex items-center gap-1">
                    <Sparkles size={12} className="text-accent" />
                    AI 创作结果 · {writeProvider}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(writeResult);
                        success("已复制到剪贴板");
                      }}
                      className="text-xs text-ink-400 hover:text-accent flex items-center gap-1"
                    >
                      <Copy size={14} /> 复制
                    </button>
                    <button
                      onClick={() => {
                        setText(writeResult);
                        setWriteResult(null);
                      }}
                      className="text-xs text-ink-400 hover:text-accent flex items-center gap-1"
                    >
                      <RefreshCw size={14} /> 设为输入
                    </button>
                  </div>
                </div>
                <div className="font-serif text-sm md:text-base text-ink-800 leading-loose whitespace-pre-wrap">
                  {writeResult}
                </div>
                <div className="pt-3 border-t border-paper-200">
                  <button
                    onClick={() => {
                      setParsingMode("rule");
                      setText(writeResult);
                      setWriteResult(null);
                    }}
                    className="text-xs text-accent hover:text-accent-dim flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> 将结果送到「智能分篇」进行分篇导入
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {parsingMode !== "write" && parsingMode === "rule" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-400 block mb-1">分隔符（留空则智能分篇）</label>
              <input
                type="text"
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                placeholder="如：---"
                className="w-full px-2 py-1.5 border border-paper-300 rounded text-xs focus:outline-none focus:border-ink-300"
              />
            </div>
            <div>
              <label className="text-xs text-ink-400 block mb-1">默认类型</label>
              <select
                value={defaultType}
                onChange={(e) => setDefaultType(e.target.value)}
                className="w-full px-2 py-1.5 border border-paper-300 rounded text-xs focus:outline-none focus:border-ink-300"
              >
                {["诗", "词", "曲", "文", "赋", "随笔", "日记", "小说"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red">{error}</p>}

        {parsingMode !== "write" && (
        <button
          onClick={handleParse}
          disabled={parsing || !text.trim()}
          className="px-6 py-2.5 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {parsing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> 智能解析中...
            </>
          ) : (
            <>
              <RefreshCw size={16} /> 智能解析
            </>
          )}
        </button>
        )}
      </div>

      {/* 解析结果 */}
      {articles && articles.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* 操作栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={articles.every(a => a.selected)}
                  onChange={toggleSelectAll}
                  className="rounded border-paper-300 text-accent focus:ring-accent"
                />
                <span className="text-sm text-ink-600">全选</span>
              </label>
              <span className="text-sm text-ink-400">
                已选择 {selectedCount} / {articles.length} 篇
              </span>
            </div>
            <button
              onClick={handleImport}
              disabled={parsing || selectedCount === 0}
              className="px-6 py-2.5 bg-green text-white rounded-md text-sm hover:bg-green-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {parsing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> 导入中...
                </>
              ) : (
                <>
                  <Upload size={16} /> 确认导入至樗栎集
                </>
              )}
            </button>
          </div>

          {/* 重复内容提示 */}
          {duplicates && duplicates.length > 0 && (
            <div className="p-4 bg-amber/5 border border-amber/20 rounded-md">
              <p className="text-sm text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                检测到相似文章 {duplicates.length} 组（建议人工比对校准）
              </p>
              <div className="space-y-3">
                {duplicates.map((dup, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        相似度 {Math.round(dup.similarity * 100)}%
                      </span>
                      <span className="text-xs text-ink-500">{dup.diffSummary}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-ink-400">原文：</span>
                        <span className="text-ink-700">{dup.original}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-ink-400">相似：</span>
                        <span className="text-amber-700">{dup.duplicate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 解析结果列表 */}
          <div className="grid gap-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className={`bg-white rounded-lg border-2 transition-all ${
                  article.selected
                    ? "border-accent"
                    : "border-paper-200 opacity-60"
                }`}
              >
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-paper-100">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={article.selected}
                      onChange={() => toggleSelect(article.id)}
                      className="rounded border-paper-300 text-accent focus:ring-accent"
                    />
                    <FileText size={16} className="text-accent" />
                    <span className={`text-sm px-2 py-0.5 rounded bg-paper-100 ${getConfidenceColor(article.confidence)}`}>
                      {getTypeBadge(article.type, article.subType)}
                      <span className="text-ink-400 ml-1">({Math.round(article.confidence * 100)}%)</span>
                    </span>
                  </div>
                  <button
                    onClick={() => removeArticle(article.id)}
                    className="text-xs text-ink-400 hover:text-red flex items-center gap-1"
                  >
                    <Trash2 size={14} /> 删除
                  </button>
                </div>

                {/* 内容 */}
                <div className="p-4 space-y-4">
                  {/* 标题 */}
                  <div>
                    <label className="block text-xs text-ink-400 mb-1">标题</label>
                    <input
                      type="text"
                      value={article.title}
                      onChange={(e) => updateArticle(article.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* 正文 */}
                  {/* 序（如果有） */}
            {article.preface && (
              <div>
                <label className="block text-xs text-ink-400 mb-1">
                  <span className="text-blue-600">【序】</span> 系统识别的序言（可编辑）
                </label>
                <textarea
                  value={article.preface}
                  onChange={(e) => updateArticle(article.id, 'preface', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-blue-200 bg-blue-50/50 rounded-md text-sm font-serif focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
            )}

            {/* 正文 */}
            <div>
              <label className="block text-xs text-ink-400 mb-1">正文</label>
              <textarea
                value={article.body}
                onChange={(e) => updateArticle(article.id, 'body', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm font-serif focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* 跋（如果有） */}
            {article.postscript && (
              <div>
                <label className="block text-xs text-ink-400 mb-1">
                  <span className="text-amber-600">【跋】</span> 系统识别的跋语（可编辑）
                </label>
                <textarea
                  value={article.postscript}
                  onChange={(e) => updateArticle(article.id, 'postscript', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-amber-200 bg-amber-50/50 rounded-md text-sm font-serif focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            )}

            {/* 识别依据 */}
                  {article.classificationReasons && article.classificationReasons.length > 0 && (
                    <details className="text-xs">
                      <summary className="text-ink-400 hover:text-ink-600 cursor-pointer flex items-center gap-1">
                        <Tag size={12} /> 识别依据
                      </summary>
                      <div className="mt-2 pl-4 space-y-1 text-ink-500 border-l-2 border-paper-200">
                        {article.classificationReasons.map((reason, idx) => (
                          <p key={idx}>{reason}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
