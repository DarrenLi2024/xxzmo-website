"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2, Check, ExternalLink, BookOpen, Languages, Lightbulb, Tags } from "lucide-react";

interface SourceCandidate {
  id: string;
  title: string;
  url: string;
  source: "wikisource" | "gushiwen" | "shicimingju" | "guoxue";
  label?: string;
  excerpt: string;
  body: string;
  confidence: number;
  script?: "zh-Hans" | "source-original";
}

interface GeneratedResult {
  id: string;
  slug: string;
  title: string;
  author?: string;
  dynasty?: string;
  body: string;
  annotations?: { term: string; explanation: string }[] | null;
  translation?: string | null;
  appreciation?: string | null;
  tags: string[];
  status: string;
  confidence?: number;
  sourceCandidate?: SourceCandidate;
  aiMeta?: {
    promptVersion: string;
    logId: string | null;
    providerName: string;
    providerModel: string;
    durationMs: number;
  };
  aiWarning?: string;
}

function parseAnnotations(annotations: unknown): { term: string; explanation: string }[] {
  if (Array.isArray(annotations)) return annotations;
  if (typeof annotations === "string") {
    try {
      return JSON.parse(annotations);
    } catch {
      return [];
    }
  }
  return [];
}

export default function AdminJiguTaiPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<SourceCandidate[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceCandidate | null>(null);

  async function handleGenerate(sourceCandidate?: SourceCandidate) {
    if (!title.trim()) return;
    setGenerating(true);
    setError("");
    if (sourceCandidate) setResult(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch("/api/admin/jigu-tai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), sourceCandidate }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.needSource) {
          setCandidates(data.candidates || []);
          setSelectedSource(data.candidates?.[0] || null);
          setError(data.message || "");
        } else {
          setResult(data);
          setCandidates([]);
          setSelectedSource(null);
          setTitle("");
        }
      } else {
        const data = await res.json();
        setError(data.error || "导入失败");
        if (data.needConfig) {
          setError(data.error);
        }
      }
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError(sourceCandidate
          ? "来源导入超时，请重试。"
          : "来源检索超时，请重试。");
      } else {
        setError("网络错误，请重试");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setGenerating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !generating) handleGenerate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif text-ink-900">辑古台</h2>
        <Link
          href="/admin/jigu-tai/batch"
          className="px-4 py-2 border border-paper-300 text-ink-700 rounded-md text-sm no-underline hover:bg-paper-200 transition-colors"
        >
          批量导入
        </Link>
      </div>

      <div className="bg-paper-50 border border-paper-200 rounded-lg p-6">
        <label className="block text-sm text-ink-700 mb-2">
          输入经典篇目标题，先检索并导入可靠来源原文；确认正文后，在集校编辑页执行 AI 补全
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：滕王阁序 · 蜀道难 · 岳阳楼记 · 春江花月夜"
            disabled={generating}
            className="flex-1 px-4 py-3 rounded-md border border-paper-300 bg-white text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={generating || !title.trim()}
            className="px-6 py-3 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> 处理中...
              </>
            ) : (
              <>
                <Sparkles size={16} /> 检索来源
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red/5 border border-red/20 rounded-md">
            <p className="text-sm text-red">{error}</p>
            {error.includes("API 配置") && (
              <Link href="/admin/api-config" className="text-xs text-accent mt-1 inline-block">
                前往 API 配置 →
              </Link>
            )}
          </div>
        )}

        {candidates.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink-800">请选择原文来源</h3>
              <button
                onClick={() => selectedSource && handleGenerate(selectedSource)}
                disabled={generating || !selectedSource}
                className="px-4 py-2 bg-accent text-white rounded-md text-xs hover:bg-accent-dim transition-colors disabled:opacity-50"
              >
                {generating ? "导入中..." : "导入所选来源原文"}
              </button>
            </div>
            <div className="grid gap-3">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelectedSource(candidate)}
                  className={`text-left p-4 rounded-md border transition-colors ${
                    selectedSource?.id === candidate.id
                      ? "border-accent bg-accent/5"
                      : "border-paper-200 bg-white hover:bg-paper-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-900 font-medium">{candidate.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                          {candidate.label || candidate.source}
                        </span>
                      </div>
                      {candidate.url && <div className="text-xs text-ink-400 mt-1 truncate max-w-md">{candidate.url}</div>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-paper-100 text-ink-500 whitespace-nowrap">
                      {Math.round(candidate.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-2 line-clamp-3">{candidate.excerpt}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {/* Success banner */}
            <div className="p-3 bg-green/5 border border-green/20 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green" />
                <span className="text-sm text-ink-700">
                  已导入「{result.title}」{result.author ? `（${result.author}${result.dynasty ? ` · ${result.dynasty}` : ""}）` : ""}来源原文并进入待校
                  {result.confidence ? ` · 置信度 ${Math.round(result.confidence * 100)}%` : ""}
                </span>
              </div>
              <Link
                href={`/admin/jigu/${result.id}/edit`}
                className="text-xs text-accent hover:text-accent-dim no-underline flex items-center gap-1 whitespace-nowrap"
              >
                集校编辑 <ExternalLink size={12} />
              </Link>
            </div>

            {result.aiWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                {result.aiWarning}
              </div>
            )}

            {/* Content preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {result.sourceCandidate && (
                <div className="lg:col-span-2 bg-white border border-paper-200 rounded-md p-4">
                  <h4 className="text-xs text-ink-500 mb-2">来源证据</h4>
                  <p className="text-sm text-ink-800">{result.sourceCandidate.title}</p>
                  <p className="text-xs text-ink-400 mt-1">
                    {result.sourceCandidate.script === "zh-Hans" ? "简体来源变体" : "原站文本（请人工确认繁简与版面）"}
                  </p>
                  <a href={result.sourceCandidate.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent no-underline">
                    {result.sourceCandidate.url}
                  </a>
                  {result.aiMeta && (
                    <p className="text-xs text-ink-400 mt-2">
                      {result.aiMeta.promptVersion} · {result.aiMeta.providerModel} · {result.aiMeta.durationMs}ms
                    </p>
                  )}
                </div>
              )}

              {/* Body preview */}
              <div className="bg-white border border-paper-200 rounded-md p-4">
                <h4 className="flex items-center gap-1.5 text-xs text-ink-500 mb-2">
                  <BookOpen size={14} /> 原文
                </h4>
                <pre className="text-sm text-ink-800 font-serif leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {result.body?.slice(0, 500)}{(result.body?.length || 0) > 500 ? "\n\n..." : ""}
                </pre>
              </div>

              {/* Annotations preview */}
              <div className="bg-white border border-paper-200 rounded-md p-4">
                <h4 className="flex items-center gap-1.5 text-xs text-ink-500 mb-2">
                  <Tags size={14} /> 注释 ({parseAnnotations(result.annotations).length}条) · 标签
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {parseAnnotations(result.annotations).slice(0, 8).map((a, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-ink-900 font-medium">{a.term}</span>
                      <span className="text-ink-500">：{a.explanation}</span>
                    </div>
                  ))}
                  {parseAnnotations(result.annotations).length > 8 && (
                    <p className="text-xs text-ink-300">... 共 {parseAnnotations(result.annotations).length} 条</p>
                  )}
                </div>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {result.tags.map((t) => (
                    <span key={t} className="text-xs px-1.5 py-0.5 bg-paper-100 rounded-full text-ink-500">{t}</span>
                  ))}
                </div>
              </div>

              {/* Translation */}
              {result.translation && (
                <div className="bg-white border border-paper-200 rounded-md p-4">
                  <h4 className="flex items-center gap-1.5 text-xs text-ink-500 mb-2">
                    <Languages size={14} /> 译文
                  </h4>
                  <p className="text-sm text-ink-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {result.translation.slice(0, 400)}{result.translation.length > 400 ? "..." : ""}
                  </p>
                </div>
              )}

              {/* Appreciation */}
              {result.appreciation && (
                <div className="bg-white border border-paper-200 rounded-md p-4">
                  <h4 className="flex items-center gap-1.5 text-xs text-ink-500 mb-2">
                    <Lightbulb size={14} /> 赏析
                  </h4>
                  <p className="text-sm text-ink-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {result.appreciation.slice(0, 400)}{result.appreciation.length > 400 ? "..." : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-ink-300 text-xs mt-4 leading-relaxed">
        辑古台证据模式：输入篇目标题 → 联网检索原文来源 → 人工确认并导入待校原文 → 在编辑页基于证据执行 AI 补全。
        <br />
        所有结果进入待校状态。需先在 <Link href="/admin/api-config" className="text-accent">API 配置</Link> 中启用 LLM Provider。
      </p>
    </div>
  );
}
