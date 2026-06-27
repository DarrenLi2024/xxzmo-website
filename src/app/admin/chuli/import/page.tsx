"use client";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, AlertTriangle, FileText, Tag, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

const EXAMPLE = `标题：秋日午后口占一首
类型：诗
日期：2024年秋
标签：秋天, 闲适, 感怀

秋风起兮白云飞，
草木黄落兮雁南归。
兰有秀兮菊有芳，
怀佳人兮不能忘。

---
标题：夜读偶得
类型：诗
日期：2024年冬
标签：夜, 读书, 即兴

更深人静一灯孤，
黄卷青灯伴老夫。
读到会心微笑处，
不知明月上庭梧。`;

interface ImportArticle {
  id: string;
  slug: string;
  title: string;
  type: string;
  subType?: string;
  confidence: number;
  classificationReasons?: string[];
}

interface DuplicateItem {
  original: string;
  duplicate: string;
  type: "exact" | "similar";
  similarity: number;
  diffSummary: string;
}

interface ExistingMatch {
  type: "exact" | "similar";
  existingId: string;
  existingTitle: string;
  importedTitle: string;
  similarity: number;
  importedBodyPreview: string;
  existingBodyPreview: string;
}

interface SkippedItem {
  reason: string;
  content: string;
  type?: string;
}

export default function AdminChuliImportPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportArticle[] | null>(null);
  const [resultMeta, setResultMeta] = useState<{ strategy: string; count: number; totalBlocks: number; parsedArticlesCount: number } | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateItem[] | null>(null);
  const [existingMatches, setExistingMatches] = useState<ExistingMatch[] | null>(null);
  const [skipped, setSkipped] = useState<SkippedItem[] | null>(null);
  const [error, setError] = useState("");
  const [separator, setSeparator] = useState("");
  const [defaultType, setDefaultType] = useState("诗");
  const [defaultStatus, setDefaultStatus] = useState("draft");
  const [importTime, setImportTime] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{
    totalParsed: number;
    successfullyImported: number;
    skippedCount: number;
    duplicateCount: number;
    similarMatchCount: number;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [autoAiWorkflow, setAutoAiWorkflow] = useState(true);
  const [aiWorkflow, setAiWorkflow] = useState<{ enabled: boolean; batchId: string | null; queued: number; failed: number } | null>(null);

  async function handleImport() {
    if (!text.trim()) return;
    setImporting(true);
    setError("");
    setResults(null);
    setDuplicates(null);
    setExistingMatches(null);
    setSkipped(null);
    setAiWorkflow(null);

    try {
      const res = await fetch("/api/admin/chuli-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          separator,
          defaultType,
          defaultStatus,
          autoAiWorkflow,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.articles);
        setDuplicates(data.duplicates || []);
        setExistingMatches(data.existingMatches || []);
        setSkipped(data.skipped || []);
        setResultMeta({ 
          strategy: data.strategy, 
          count: data.count, 
          totalBlocks: data.totalBlocks,
          parsedArticlesCount: data.parsedArticlesCount,
        });
        setImportTime(data.importTime || null);
        setImportStats(data.importStats || null);
        setAiWorkflow(data.aiWorkflow || null);
        setText("");
        const msg = data.count > 0 ? `成功导入 ${data.count} 篇` : "未导入任何文章";
        success(msg);
      } else {
        const data = await res.json();
        setError(data.error || "导入失败");
        toastError(data.error || "导入失败");
      }
    } catch {
      setError("网络错误，请重试");
      toastError("网络错误，请重试");
    } finally {
      setImporting(false);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif text-ink-900">樗栎集 · 批量导入</h2>
        <button
          onClick={() => router.push("/admin/chuli")}
          className="px-4 py-2 border border-paper-300 text-ink-700 rounded-md text-sm hover:bg-paper-200 transition-colors"
        >
          返回管理
        </button>
      </div>

      <div className="bg-paper-50 border border-paper-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm text-ink-700 mb-2">
            粘贴待导入的诗文 — 支持智能分篇（标题识别 / 空行分隔 / 序号标记 / 元数据头），也可手动指定分隔符
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            rows={16}
            disabled={importing}
            className="w-full px-4 py-3 rounded-md border border-paper-300 bg-white text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 transition-all font-serif leading-relaxed disabled:opacity-50"
          />
        </div>

        <details className="text-sm">
          <summary className="text-ink-500 cursor-pointer hover:text-ink-700">格式说明</summary>
          <div className="mt-2 p-4 bg-paper-100 rounded-md text-xs text-ink-500 space-y-1 font-mono whitespace-pre-wrap">
            {`【智能分篇】系统自动按优先级尝试以下策略拆分多篇文章：
  1. 显式分隔符（如 "---"）
  2. 连续空行（段落级分离）
  3. 标题模式识别（以诗/词/赋/记等结尾的短行 → 视为新篇标题）
  4. 元数据头 "标题：" → 新篇开始
  5. 序号标记（其一/其二、一./二. 等）

【元数据格式】（键：值，每篇可选）
  标题：文章标题（若无则自动取首行）
  类型：诗/词/曲/文/随笔/日记
  日期：如"2024年秋"
  标签：标签1, 标签2
  序/小序：前置引文
  跋/后记：后置跋文
  备注/注：创作背景

【体裁智能识别】系统自动识别：
  诗 → 五言绝句/七言绝句/五言律诗/七言律诗/乐府/古风/新诗/打油诗
  词 → 自动识别词牌名（如梦令/浣溪沙/蝶恋花等）
  文 → 记/序/书/论/说/表/铭/传/状等
  赋、随笔、小说等

【智能去重】
  - 100%重复：自动跳过
  - 相似度70%-95%：标记提示，需人工确认`}
          </div>
        </details>

        <div className="grid grid-cols-3 gap-3">
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
          <div>
            <label className="text-xs text-ink-400 block mb-1">导入状态</label>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              className="w-full px-2 py-1.5 border border-paper-300 rounded text-xs focus:outline-none focus:border-ink-300"
            >
              <option value="draft">草稿</option>
              <option value="published">直接发布</option>
            </select>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            checked={autoAiWorkflow}
            onChange={(e) => setAutoAiWorkflow(e.target.checked)}
            disabled={importing}
            className="h-4 w-4 rounded border-paper-300"
          />
          导入后自动进入 AI 流水线
        </label>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          onClick={handleImport}
          disabled={importing || !text.trim()}
          className="px-6 py-2.5 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {importing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> 解析导入中...
            </>
          ) : (
            <>
              <Upload size={16} /> 解析并导入
            </>
          )}
        </button>

        {/* 导入结果 */}
        {results && (
          <div className="mt-6 space-y-4">
            {aiWorkflow?.enabled && (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm text-ink-700">
                AI 流水线已创建：{aiWorkflow.queued} 篇已入队
                {aiWorkflow.failed > 0 ? `，${aiWorkflow.failed} 篇入队失败` : ""}
                {aiWorkflow.batchId ? `。批次：${aiWorkflow.batchId}` : ""}
              </div>
            )}

            {/* 导入统计概览 */}
            {importTime && importStats && (
              <div className="flex flex-wrap items-center gap-4 p-3 bg-paper-100 rounded-md text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-400">导入时间：</span>
                  <span className="text-ink-700">{new Date(importTime).toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-400">解析：</span>
                  <span className="text-ink-700">{importStats.totalParsed}篇</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-400">成功：</span>
                  <span className="text-green">{importStats.successfullyImported}篇</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-400">跳过：</span>
                  <span className="text-amber">{importStats.skippedCount}篇</span>
                </div>
                {importStats.duplicateCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-400">重复：</span>
                    <span className="text-red">{importStats.duplicateCount}篇</span>
                  </div>
                )}
                {importStats.similarMatchCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-400">相似：</span>
                    <span className="text-blue">{importStats.similarMatchCount}篇</span>
                  </div>
                )}
              </div>
            )}

            {/* 状态筛选标签 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-400">状态筛选：</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    statusFilter === "all" 
                      ? "bg-accent text-white" 
                      : "bg-paper-100 text-ink-500 hover:bg-paper-200"
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setStatusFilter("draft")}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    statusFilter === "draft" 
                      ? "bg-amber text-white" 
                      : "bg-paper-100 text-ink-500 hover:bg-paper-200"
                  }`}
                >
                  草稿
                </button>
                <button
                  onClick={() => setStatusFilter("published")}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    statusFilter === "published" 
                      ? "bg-green text-white" 
                      : "bg-paper-100 text-ink-500 hover:bg-paper-200"
                  }`}
                >
                  已发布
                </button>
              </div>
            </div>

            {/* 导入成功列表 */}
            <div className="p-4 bg-green/5 border border-green/20 rounded-md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-ink-700 flex items-center gap-2">
                  <Check size={14} className="text-green" />
                  成功导入 {results.length} 篇
                  {resultMeta && (
                    <>
                      <span className="text-ink-400">（解析 {resultMeta.parsedArticlesCount} 篇，拆分自 {resultMeta.totalBlocks} 个区块）</span>
                    </>
                  )}
                </p>
              </div>
              {resultMeta && (
                <p className="text-xs text-ink-400 mb-3">分篇策略：{resultMeta.strategy}</p>
              )}
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {results.map((r) => (
                  <div key={r.id} className="bg-white rounded border border-paper-200 overflow-hidden">
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-3">
                        <FileText size={14} className="text-accent" />
                        <span className="text-sm text-ink-700">{r.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-paper-100 text-ink-500 ${getConfidenceColor(r.confidence)}`}>
                          {getTypeBadge(r.type, r.subType)}
                          <span className="text-ink-400 ml-1">({Math.round(r.confidence * 100)}%)</span>
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          defaultStatus === "draft" 
                            ? "bg-amber/10 text-amber-700" 
                            : "bg-green/10 text-green-700"
                        }`}>
                          {defaultStatus === "draft" ? "草稿" : "已发布"}
                        </span>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/chuli/${r.id}/edit`)}
                        className="text-xs text-accent hover:text-accent-dim flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> 编辑
                      </button>
                    </div>
                    {/* 体裁识别依据 */}
                    {r.classificationReasons && r.classificationReasons.length > 0 && (
                      <div className="px-2 pb-2">
                        <details className="text-xs">
                          <summary className="text-ink-400 hover:text-ink-600 cursor-pointer flex items-center gap-1">
                            <span>识别依据</span>
                          </summary>
                          <div className="mt-1 pl-2 space-y-1 text-ink-500 border-l-2 border-paper-200">
                            {r.classificationReasons.map((reason, idx) => (
                              <p key={idx}>{reason}</p>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 重复/相似内容提示 */}
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

            {/* 数据库已有相似文章提示 */}
            {existingMatches && existingMatches.length > 0 && (
              <div className="p-4 bg-blue/5 border border-blue/20 rounded-md">
                <p className="text-sm text-blue-800 mb-3 flex items-center gap-2">
                  <Tag size={14} />
                  数据库中已有相似文章 {existingMatches.length} 篇（建议人工比对校准）
                </p>
                <div className="space-y-3">
                  {existingMatches.map((match, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          相似度 {Math.round(match.similarity * 100)}%
                        </span>
                      </div>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-ink-400">导入标题：</span>
                          <span className="text-ink-700">{match.importedTitle}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-ink-400">已有文章：</span>
                          <span className="text-blue-700">{match.existingTitle}</span>
                          <button
                            onClick={() => router.push(`/admin/chuli/${match.existingId}/edit`)}
                            className="text-xs text-accent hover:text-accent-dim"
                          >
                            查看
                          </button>
                        </div>
                        <div className="text-xs text-ink-400 space-y-1">
                          <p>导入预览：{match.importedBodyPreview}</p>
                          <p>已有预览：{match.existingBodyPreview}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 跳过的文章 */}
            {skipped && skipped.length > 0 && (
              <div className="p-4 bg-red/5 border border-red/20 rounded-md">
                <p className="text-sm text-red-800 mb-3 flex items-center gap-2">
                  <AlertCircle size={14} />
                  已跳过 {skipped.length} 篇（重复或其他原因）
                </p>
                <ul className="text-sm text-ink-600 space-y-1">
                  {skipped.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-ink-400">·</span>
                      <span>{item.content}</span>
                      <span className="text-xs text-ink-400">({item.reason})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
