"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  PenLine,
  BookOpen,
  Tags,
  Clock,
  TrendingUp,
  Plus,
  Sparkles,
} from "lucide-react"
import { StatCard } from "@/components/admin/ui/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const TrendChart = dynamic(() => import("./TrendChart"), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })
const TypePieChart = dynamic(() => import("./TypePieChart"), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })

interface Stats {
  chuliCount: number
  jiguCount: number
  tagCount: number
  pendingCount: number
  reviewCount: number
  totalPublished: number
  sourceRatio: { chuli: number; jigu: number }
  coverage: { painting: number; ai: number }
  health: {
    articleTotal: number
    paintingCoveredCount: number
    aiCoveredCount: number
    draftCount: number
    reviewCount: number
  }
  recentActivity: { source: string; status: string; time: string }[]
  recentActions: { action: string; entityType: string; entityId: string | null; summary: string; time: string }[]
  typeDistribution: { type: string; count: number }[]
  monthlyTrends: { month: string; chuli: number; jigu: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  // 获取统计数据
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
  }, [])

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "刚刚"
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    return `${Math.floor(hours / 24)} 天前`
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">仪表盘</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">仪表盘</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/chuli/new"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-7 gap-1 px-2.5 text-[0.8rem]"
          >
            <Plus size={14} /> 新建
          </Link>
          <Link
            href="/admin/jigu-tai"
            className="inline-flex items-center justify-center rounded-lg border-0 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-7 gap-1 px-2.5 text-[0.8rem]"
          >
            <Sparkles size={14} /> 辑古台
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="樗栎集"
          value={stats.chuliCount}
          icon={PenLine}
          trend={{ value: stats.sourceRatio.chuli }}
          href="/admin/chuli"
        />
        <StatCard
          label="辑古录"
          value={stats.jiguCount}
          icon={BookOpen}
          trend={{ value: stats.sourceRatio.jigu }}
          href="/admin/jigu"
        />
        <StatCard
          label="标签数"
          value={stats.tagCount}
          icon={Tags}
          trend={{ value: stats.coverage.ai }}
          href="/admin/tags"
        />
        <StatCard
          label="待校审"
          value={stats.reviewCount}
          icon={Clock}
          trend={{ value: stats.pendingCount }}
          href="/admin/chuli"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">馆藏结构</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">原创 / 辑录</span>
              <span>{stats.sourceRatio.chuli}% / {stats.sourceRatio.jigu}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${stats.sourceRatio.chuli}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">配图覆盖率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.coverage.painting}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.health.paintingCoveredCount}/{stats.health.articleTotal} 篇已有视觉注脚
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI 辑校覆盖</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.coverage.ai}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.health.aiCoveredCount}/{stats.health.articleTotal} 篇含注释、译文或赏析
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp size={16} className="text-muted-foreground" />
              文章发布趋势（近6个月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <TrendChart data={stats.monthlyTrends} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">内容类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <TypePieChart data={stats.typeDistribution} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">最近动态</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">暂无动态</p>
            ) : (
              <div className="divide-y divide-border">
                {stats.recentActions.slice(0, 8).map((act, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                      />
                      <span className="text-foreground">{act.summary}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {timeAgo(act.time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Link
              href="/admin/chuli/new"
              className="quick-action"
            >
              <Plus size={16} />
              新建樗栎集文章
            </Link>
            <Link
              href="/admin/chuli/import"
              className="quick-action"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              批量导入樗栎集
            </Link>
            <Link
              href="/admin/jigu-tai"
              className="quick-action"
            >
              <Sparkles size={16} />
              辑古台 AI 生成
            </Link>
            <Link
              href="/admin/api-config"
              className="quick-action"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              管理 LLM API 配置
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
