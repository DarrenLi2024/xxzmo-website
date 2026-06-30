"use client"

import Link from "next/link"
import {
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from "lucide-react"
import { useAiWorkflow, type AiWorkflowStats } from "@/hooks/useAiWorkflow"
import { useToast } from "@/components/admin/Toast"

type AiStatusFilter = "all" | "queued" | "running" | "review" | "ready" | "failed" | "none"

interface AiStatsPanelProps {
  onFilterChange?: (filter: AiStatusFilter) => void
  activeFilter?: AiStatusFilter
}

const STAT_ITEMS: Array<{
  key: keyof AiWorkflowStats
  filter: AiStatusFilter
  label: string
  icon: typeof Clock
  color: string
  bg: string
  href?: string
}> = [
  { key: "queued", filter: "queued", label: "排队中", icon: Clock, color: "text-sky-600", bg: "bg-sky-50" },
  { key: "running", filter: "running", label: "运行中", icon: Loader2, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "review", filter: "review", label: "待复核", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/ai-review" },
  { key: "ready", filter: "ready", label: "可发布", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  { key: "failed", filter: "failed", label: "失败", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
]

export function AiStatsPanel({ onFilterChange, activeFilter }: AiStatsPanelProps) {
  const { success, error: toastError } = useToast()
  const { stats, loading, kicking, recovering, fetchStats, kickWorker, recoverStuck } = useAiWorkflow({
    pollIntervalMs: 10000,
  })

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

  const hasPending = stats.queued > 0 || stats.running > 0

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground">AI 流水线</h2>
        {hasPending && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <Loader2 size={12} className={kicking ? "animate-spin" : ""} />
            后台处理中
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {(stats.running > 0 || stats.queued > 0) && (
            <button
              onClick={async () => {
                const result = await recoverStuck()
                if (result.ok && result.message) {
                  success(result.message)
                } else if (result.error) {
                  toastError(result.error)
                }
              }}
              disabled={recovering || kicking}
              className="text-xs text-amber-700 hover:text-amber-900 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
            >
              <AlertCircle size={12} className={recovering ? "animate-pulse" : ""} />
              恢复卡住
            </button>
          )}
          <button
            onClick={() => void kickWorker(3)}
            disabled={kicking}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Zap size={12} className={kicking ? "animate-pulse" : ""} />
            推进
          </button>
          <button
            onClick={() => void fetchStats()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            刷新
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {STAT_ITEMS.map((item) => {
          const value = stats[item.key]
          const isActive = activeFilter === item.filter
          const content = (
            <>
              <item.icon size={20} className={`${item.color} ${item.key === "running" && hasPending ? "animate-spin" : ""}`} />
              <div>
                <div className={`text-xl font-semibold ${item.color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            </>
          )

          const className = `flex items-center gap-3 rounded-lg border p-3 transition-colors ${item.bg} ${
            isActive ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"
          }`

          if (item.href && item.key === "review" && value > 0) {
            return (
              <Link key={item.label} href={item.href} className={className}>
                {content}
              </Link>
            )
          }

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onFilterChange?.(item.filter)}
              className={`${className} text-left cursor-pointer`}
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
