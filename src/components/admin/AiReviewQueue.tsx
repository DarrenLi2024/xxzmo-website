"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { EmptyState } from "@/components/admin/EmptyState"
import { AiStatsPanel } from "@/components/admin/AiStatsPanel"

interface ReviewArticle {
  id: string
  title: string
  author: string
  type: string
  source: string
  aiStatus: string | null
  aiConfidence: number | null
  aiRiskLevel: string | null
  aiUpdatedAt: string | null
}

function editHref(article: ReviewArticle) {
  switch (article.source) {
    case "jigu":
      return `/admin/jigu/${article.id}/edit`
    case "xianyin":
      return `/admin/chuli/${article.id}/edit`
    default:
      return `/admin/chuli/${article.id}/edit`
  }
}

function riskLabel(level: string | null) {
  switch (level) {
    case "high": return { text: "高风险", className: "bg-red/10 text-red-700" }
    case "medium": return { text: "中风险", className: "bg-amber/10 text-amber-700" }
    default: return { text: "低风险", className: "bg-muted text-muted-foreground" }
  }
}

export function AiReviewQueue() {
  const [articles, setArticles] = useState<ReviewArticle[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/ai-workflows/review-queue")
      const data = await res.json()
      if (res.ok) {
        setArticles(data.articles || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  return (
    <div className="space-y-4">
      <AiStatsPanel activeFilter="review" />

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">
            共 {articles.length} 篇待复核
          </span>
          <button
            onClick={() => void fetchQueue()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={14} />
            刷新
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={24} className="animate-spin mr-2" />
            加载中...
          </div>
        ) : articles.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="暂无待复核文章"
            description="AI 流水线会将低置信度或高风险内容自动路由到这里"
          />
        ) : (
          <div className="divide-y divide-border">
            {articles.map((article) => {
              const risk = riskLabel(article.aiRiskLevel)
              const confidence = article.aiConfidence != null
                ? `${Math.round(article.aiConfidence * 100)}%`
                : "—"

              return (
                <div
                  key={article.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{article.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {article.author} · {article.type}
                      {article.aiUpdatedAt && (
                        <> · {new Date(article.aiUpdatedAt).toLocaleString("zh-CN")}</>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${risk.className}`}>
                    {risk.text}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 w-12 text-right">
                    {confidence}
                  </span>
                  <Link
                    href={editHref(article)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 shrink-0"
                  >
                    审校
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
