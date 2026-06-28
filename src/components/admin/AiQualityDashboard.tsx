"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw, TrendingUp, ThumbsUp, AlertTriangle } from "lucide-react"

interface PromptQualityStat {
  promptVersion: string
  taskName: string
  total: number
  success: number
  successRate: number
  avgDurationMs: number
  lastRunAt: string | null
}

interface PromptAbComparison {
  taskName: string
  variants: Array<{
    promptVersion: string
    label: string
    total: number
    successRate: number
    avgDurationMs: number
  }>
  winner: string | null
}

interface QualityReport {
  prompts: PromptQualityStat[]
  abComparisons: PromptAbComparison[]
  feedback: Record<string, number>
  decisions: Record<string, number>
  reviewRate: number
  adoptionRate: number
  periodDays: number
}

export function AiQualityDashboard() {
  const [report, setReport] = useState<QualityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/ai-quality?days=30")
      const data = await res.json()
      if (res.ok) setReport(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  async function handleBackfill() {
    setBackfilling(true)
    setBackfillResult(null)
    try {
      const res = await fetch("/api/admin/articles/backfill-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all", limit: 100, onlyMissing: true }),
      })
      const data = await res.json()
      if (res.ok) {
        setBackfillResult(
          `已处理 ${data.processed} 篇 · 指纹 ${data.fingerprints} · Embedding ${data.embeddings} · 跳过 ${data.skipped}`
        )
      } else {
        setBackfillResult(data.error || "回填失败")
      }
    } catch {
      setBackfillResult("回填请求失败")
    } finally {
      setBackfilling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 size={24} className="animate-spin mr-2" />
        加载质量数据...
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">近 {report.periodDays} 天</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleBackfill()}
            disabled={backfilling}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {backfilling ? <Loader2 size={14} className="animate-spin" /> : null}
            回填指纹/Embedding
          </button>
          <button
            onClick={() => void fetchReport()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {backfillResult && (
        <p className="text-xs text-muted-foreground">{backfillResult}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ThumbsUp size={16} />
            <span className="text-xs">反馈采纳率</span>
          </div>
          <div className="text-2xl font-semibold text-green-700">{report.adoptionRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            采纳 {report.feedback.adopt || 0} · 驳回 {report.feedback.reject || 0} · 修改 {report.feedback.modify || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle size={16} />
            <span className="text-xs">复核率</span>
          </div>
          <div className="text-2xl font-semibold text-amber-700">{report.reviewRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            可发布 {report.decisions.ready || 0} · 待复核 {report.decisions.review || 0} · 失败 {report.decisions.failed || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp size={16} />
            <span className="text-xs">Prompt 版本</span>
          </div>
          <div className="text-2xl font-semibold">{report.prompts.length}</div>
          <p className="text-xs text-muted-foreground mt-1">活跃 prompt 版本数</p>
        </div>
      </div>

      {report.abComparisons.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border text-sm font-medium">Prompt A/B 对比</div>
          <div className="divide-y divide-border">
            {report.abComparisons.map((exp) => (
              <div key={exp.taskName} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{exp.taskName}</span>
                  {exp.winner && (
                    <span className="text-xs text-green-700">领先：{exp.winner}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exp.variants.map((variant) => (
                    <div
                      key={variant.promptVersion}
                      className={`rounded-md border px-3 py-2 text-xs ${
                        variant.promptVersion === exp.winner
                          ? "border-green-200 bg-green-50"
                          : "border-border"
                      }`}
                    >
                      <div className="font-medium">{variant.label}</div>
                      <div className="text-muted-foreground mt-1">
                        {variant.successRate}% · {variant.total} 次 · 均 {variant.avgDurationMs}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border text-sm font-medium">Prompt 版本表现</div>
        <div className="divide-y divide-border">
          {report.prompts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">暂无 AI 任务记录</p>
          ) : (
            report.prompts.map((item) => (
              <div key={`${item.taskName}-${item.promptVersion}`} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{item.taskName}</div>
                  <div className="text-xs text-muted-foreground">{item.promptVersion}</div>
                </div>
                <div className="text-right text-xs">
                  <div className={item.successRate >= 80 ? "text-green-700" : "text-amber-700"}>
                    {item.successRate}% · {item.success}/{item.total}
                  </div>
                  <div className="text-muted-foreground">均 {item.avgDurationMs}ms</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
