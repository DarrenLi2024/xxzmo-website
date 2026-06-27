"use client"

import { useState, useEffect } from "react"
import {
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from "lucide-react"

interface AiStats {
  queued: number
  running: number
  review: number
  ready: number
  failed: number
  total: number
}

export function AiStatsPanel() {
  const [stats, setStats] = useState<AiStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/ai-workflows/stats")
      const data = await res.json()
      if (res.ok) {
        setStats(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-3 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const items = [
    { label: "排队中", value: stats.queued, icon: Clock, color: "text-sky-600", bg: "bg-sky-50" },
    { label: "运行中", value: stats.running, icon: Loader2, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "待复核", value: stats.review, icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "可发布", value: stats.ready, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "失败", value: stats.failed, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  ]

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground">AI 流水线状态</h2>
        <button
          onClick={fetchStats}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          刷新
        </button>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 rounded-lg border border-border p-3 ${item.bg}`}
          >
            <item.icon size={20} className={item.color} />
            <div>
              <div className={`text-xl font-semibold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
