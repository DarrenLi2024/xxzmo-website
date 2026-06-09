"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Eye,
  Plus,
  Upload,
  RefreshCw,
  Download,
  Search,
  CheckSquare,
  XSquare,
  Pencil, PenLine,
  Trash2,
  Send,
  Loader2,
  AlertTriangle,
  X,
  ArrowRightLeft,
  Trash,
  Zap,
} from "lucide-react"
import type { ArticleSource } from "@/lib/constants"
import type { ArticleAdminData } from "@/lib/serialize"
import { useToast } from "@/components/admin/Toast"
import { useConfirm } from "@/components/admin/ConfirmDialog"
import { TableSkeleton } from "@/components/admin/Skeleton"
import { EmptyState } from "@/components/admin/EmptyState"

interface DuplicatePair {
  id1: string
  title1: string
  id2: string
  title2: string
  similarity: number
  type: "exact" | "similar"
}

interface Props {
  source: ArticleSource
  title: string
  createLabel: string
  importHref?: string
  importLabel?: string
  createHref: string
  editHrefPrefix: string
  previewHrefPrefix: string
  emptyText: string
  col2Header: string
  col2Key: "type" | "author"
}

export function AdminArticleList({
  source,
  title: pageTitle,
  createLabel,
  importHref,
  importLabel,
  createHref,
  editHrefPrefix,
  previewHrefPrefix,
  emptyText,
  col2Header,
  col2Key,
}: Props) {
  const [articles, setArticles] = useState<ArticleAdminData[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "review" | "published">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([])
  const [detectingDuplicates, setDetectingDuplicates] = useState(false)
  const [batchAiAssistLoading, setBatchAiAssistLoading] = useState(false)
  const [batchPinyinLoading, setBatchPinyinLoading] = useState(false)
  const [batchClearAiLoading, setBatchClearAiLoading] = useState(false)
  const [batchUnifiedLoading, setBatchUnifiedLoading] = useState(false)
  const [batchClearPaintingLoading, setBatchClearPaintingLoading] = useState(false)
  const { success, error: toastError } = useToast()
  const { confirm } = useConfirm()

  const filteredArticles = articles

  const fetchArticles = useCallback(async () => {
    const params = new URLSearchParams({
      source,
      status: statusFilter,
      page: page.toString(),
      pageSize: pageSize.toString(),
    })
    if (searchQuery.trim()) params.set("search", searchQuery.trim())
    if (typeFilter) params.set("type", typeFilter)
    if (tagFilter.trim()) params.set("tag", tagFilter.trim())
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    const res = await fetch(`/api/admin/articles?${params}`)
    const data = await res.json()
    setArticles(data.articles || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 1)
    setSelected(new Set())
    setLoading(false)
  }, [page, pageSize, searchQuery, source, statusFilter, tagFilter, typeFilter, dateFrom, dateTo])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, tagFilter, typeFilter, dateFrom, dateTo])

  function resetFilters() {
    setSearchQuery("")
    setTypeFilter("")
    setTagFilter("")
    setStatusFilter("all")
    setDateFrom("")
    setDateTo("")
    setPageSize(20)
    setPage(1)
  }

  function exportCsv() {
    const rows = filteredArticles.filter((article) => selected.size === 0 || selected.has(article.id))
    const headers = ["标题", col2Header, "状态", "标签", "创建时间"]
    const csvRows = rows.map((article) => [
      article.title,
      String(article[col2Key] || ""),
      article.status,
      article.tags.join(" / "),
      new Date(article.createdAt).toLocaleString("zh-CN"),
    ])
    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${source}-articles.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filteredArticles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredArticles.map((a) => a.id)))
    }
  }

  async function handleDelete(id: string, articleTitle: string) {
    confirm({
      title: `确认删除「${articleTitle}」？`,
      description: "此操作不可恢复",
      variant: "danger",
      async onConfirm() {
        await fetch(`/api/admin/articles/${id}`, { method: "DELETE" })
        success(`已删除「${articleTitle}」`)
        setPage(1)
        fetchArticles()
      },
    })
  }

  async function handlePublish(id: string) {
    await fetch(`/api/admin/articles/${id}/publish`, { method: "POST" })
    success("已发布")
    fetchArticles()
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return
    const titles = filteredArticles.filter((a) => selected.has(a.id)).map((a) => a.title).slice(0, 5).join("、")
    confirm({
      title: `确认删除选中的 ${selected.size} 篇文章？`,
      description: `包括：${titles}${selected.size > 5 ? ` 等 ${selected.size} 篇` : ""}`,
      variant: "danger",
      async onConfirm() {
        setBatchProgress({ current: 0, total: selected.size })
        const ids = Array.from(selected)
        const res = await fetch("/api/admin/articles/batch-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        })
        const data = await res.json()
        const succeeded = data.deleted || 0
        const failed = ids.length - succeeded
        if (failed > 0) {
          toastError(`已删除 ${succeeded} 篇，失败 ${failed} 篇`)
        } else {
          success(`已删除 ${succeeded} 篇`)
        }
        setPage(1)
        fetchArticles()
      },
    })
  }

  async function handleBatchPublish() {
    if (selected.size === 0) return
    setBatchProgress({ current: 0, total: selected.size })
    const ids = Array.from(selected)
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/admin/articles/${id}/publish`, { method: "POST" })
      )
    )
    setBatchProgress(null)
    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.ok).length
    const failed = results.length - succeeded
    if (failed > 0) {
      toastError(`已发布 ${succeeded} 篇，失败 ${failed} 篇`)
    } else {
      success(`已发布 ${succeeded} 篇`)
    }
    fetchArticles()
  }

  async function handleBatchAiAssist() {
    if (selected.size === 0) return
    
    confirm({
      title: `确认对选中的 ${selected.size} 篇文章进行AI辅助生成？`,
      description: "将自动生成注解、翻译、赏析等内容",
      async onConfirm() {
        setBatchAiAssistLoading(true)
        try {
          const res = await fetch("/api/admin/articles/batch-ai-assist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleIds: Array.from(selected), source }),
          })
          const data = await res.json()
          
          if (data.success > 0) {
            success(`AI辅助生成完成：成功 ${data.success} 篇`)
          }
          if (data.failed > 0) {
            toastError(`失败 ${data.failed} 篇`)
          }
          if (data.errors && data.errors.length > 0) {
            console.error("AI辅助生成错误:", data.errors)
          }
          fetchArticles()
        } catch {
          toastError("批量AI辅助生成失败")
        } finally {
          setBatchAiAssistLoading(false)
        }
      },
    })
  }

  async function handleBatchPinyinCalibration() {
    if (selected.size === 0) return

    confirm({
      title: `确认对选中的 ${selected.size} 篇文章进行AI拼音校准？`,
      description: "将按全文语境检查多音字、古地名与通假字，并覆盖现有拼音缓存；会调用已配置的模型。",
      async onConfirm() {
        setBatchPinyinLoading(true)
        try {
          const res = await fetch("/api/admin/articles/batch-pinyin-calibrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleIds: Array.from(selected) }),
          })
          const data = await res.json()

          if (data.success > 0) {
            const uncertainText = data.uncertain > 0 ? `，待复核 ${data.uncertain} 项` : ""
            success(`拼音校准完成：${data.success} 篇，修正 ${data.corrections} 项${uncertainText}`)
          }
          if (data.failed > 0) {
            toastError(`拼音校准失败 ${data.failed} 篇`)
          }
          fetchArticles()
        } catch {
          toastError("批量拼音校准失败")
        } finally {
          setBatchPinyinLoading(false)
        }
      },
    })
  }

  async function handleBatchUnified() {
    if (selected.size === 0) return

    confirm({
      title: `确认对选中的 ${selected.size} 篇文章进行一键AI辅助+拼音校准？`,
      description: "每批处理 3 篇，自动逐批执行。完成后将显示总耗时和拼音修正统计。",
      async onConfirm() {
        setBatchUnifiedLoading(true)
        const startMs = Date.now()
        try {
          // 1. 创建任务
          const createRes = await fetch("/api/admin/articles/batch-unified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              articleIds: Array.from(selected),
              concurrency: 1,
              chunkSize: 3,
            }),
          })
          const { taskId, total } = await createRes.json()

          if (!taskId) {
            toastError("创建任务失败")
            setBatchUnifiedLoading(false)
            return
          }

          // 2. 逐片执行 + 轮询进度
          let currentPercent = 0
          const pollIntervalMs = 2000

          while (true) {
            // 触发下一片执行
            const execRes = await fetch(
              `/api/admin/articles/batch-unified?taskId=${taskId}&action=execute`
            )
            const progress = await execRes.json()

            if (progress.status === "completed") {
              const durSec = ((Date.now() - startMs) / 1000).toFixed(1)
              const pinyinInfo = progress.progress.pinyinCorrections > 0
                ? `，拼音修正 ${progress.progress.pinyinCorrections} 项${progress.progress.pinyinUncertain > 0 ? `（待复核 ${progress.progress.pinyinUncertain}）` : ""}`
                : ""
              success(
                `一键完成：${progress.progress.success}/${progress.progress.total} 篇，耗时 ${durSec}s${pinyinInfo}`
              )
              if (progress.progress.failed > 0) {
                toastError(`失败 ${progress.progress.failed} 篇`)
              }
              break
            }

            // 更新进度（用 success toast 做进度提示）
            currentPercent = progress.progress.percent
            // 短暂等待后继续下一片
            await new Promise((r) => setTimeout(r, pollIntervalMs))
          }

          fetchArticles()
        } catch {
          toastError("一键AI辅助失败")
        } finally {
          setBatchUnifiedLoading(false)
        }
      },
    })
  }

  async function handleClearAiConfig() {
    if (selected.size === 0) return
    
    confirm({
      title: `确认清除选中的 ${selected.size} 篇文章的AI配置？`,
      description: "将删除所有AI生成的注解、翻译、赏析和标签",
      async onConfirm() {
        setBatchClearAiLoading(true)
        try {
          const res = await fetch("/api/admin/articles/batch-clear-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleIds: Array.from(selected) }),
          })
          const data = await res.json()
          
          if (data.success > 0) {
            success(`已清除 ${data.success} 篇文章的AI配置`)
          }
          if (data.failed > 0) {
            toastError(`失败 ${data.failed} 篇`)
          }
          if (data.errors && data.errors.length > 0) {
            console.error("清除AI配置错误:", data.errors)
          }
          fetchArticles()
        } catch {
          toastError("批量清除AI配置失败")
        } finally {
          setBatchClearAiLoading(false)
        }
      },
    })
  }

  async function handleClearPainting() {
    if (selected.size === 0) return
    
    confirm({
      title: `确认清除选中的 ${selected.size} 篇文章的配图？`,
      description: "将删除所有文章的配图关联",
      async onConfirm() {
        setBatchClearPaintingLoading(true)
        try {
          const res = await fetch("/api/admin/articles/batch-clear-painting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleIds: Array.from(selected) }),
          })
          const data = await res.json()
          
          if (data.success > 0) {
            success(`已清除 ${data.success} 篇文章的配图`)
          }
          if (data.skipped > 0) {
            success(`${data.skipped} 篇无配图已跳过`)
          }
          if (data.failed > 0) {
            toastError(`失败 ${data.failed} 篇`)
          }
          if (data.errors && data.errors.length > 0) {
            console.error("清除配图错误:", data.errors)
          }
          fetchArticles()
        } catch {
          toastError("批量清除配图失败")
        } finally {
          setBatchClearPaintingLoading(false)
        }
      },
    })
  }

  async function handleDetectDuplicates() {
    setDetectingDuplicates(true)
    try {
      const res = await fetch("/api/admin/articles/find-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, threshold: 0.85 }),
      })
      const data = await res.json()
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicates(data.duplicates)
        setDuplicateDialogOpen(true)
      } else {
        success("未检测到重复内容")
      }
    } catch {
      toastError("检测失败，请重试")
    } finally {
      setDetectingDuplicates(false)
    }
  }

  async function handleMergeArticles(id1: string, id2: string, keepFirst: boolean) {
    const keepId = keepFirst ? id1 : id2
    const deleteId = keepFirst ? id2 : id1
    
    confirm({
      title: `确认合并？`,
      description: `将保留「${keepFirst ? 
        duplicates.find(d => d.id1 === id1)?.title1 || 
        duplicates.find(d => d.id2 === id1)?.title2 :
        duplicates.find(d => d.id1 === id2)?.title1 || 
        duplicates.find(d => d.id2 === id2)?.title2
      }」并删除另一篇`,
      async onConfirm() {
        await fetch(`/api/admin/articles/${deleteId}`, { method: "DELETE" })
        setDuplicates(d => d.filter(p => !(p.id1 === id1 && p.id2 === id2) && !(p.id1 === id2 && p.id2 === id1)))
        success("已合并")
        fetchArticles()
      },
    })
  }

  async function handleDeleteDuplicate(id1: string, id2: string, deleteFirst: boolean) {
    const deleteId = deleteFirst ? id1 : id2
    const title = deleteFirst ? 
      duplicates.find(d => d.id1 === id1)?.title1 || duplicates.find(d => d.id2 === id1)?.title2 :
      duplicates.find(d => d.id1 === id2)?.title1 || duplicates.find(d => d.id2 === id2)?.title2
    
    confirm({
      title: `确认删除「${title}」？`,
      description: "此操作不可恢复",
      variant: "danger",
      async onConfirm() {
        await fetch(`/api/admin/articles/${deleteId}`, { method: "DELETE" })
        setDuplicates(d => d.filter(p => !(p.id1 === id1 && p.id2 === id2) && !(p.id1 === id2 && p.id2 === id1)))
        success(`已删除「${title}」`)
        fetchArticles()
      },
    })
  }

  async function handleDeleteAllDuplicates() {
    if (duplicates.length === 0) return
    
    confirm({
      title: `确认智能清理全部 ${duplicates.length} 组重复项？`,
      description: `将按正文质量、信息完整度、发布日期等维度自动择优保留。此操作不可恢复。`,
      variant: "danger",
      async onConfirm() {
        try {
          const res = await fetch("/api/admin/articles/auto-dedup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pairs: duplicates.map(d => ({ id1: d.id1, id2: d.id2 })) }),
          })
          const data = await res.json()
          if (data.deleted > 0) {
            success(`智能清理完成：保留 ${data.kept} 篇，删除 ${data.deleted} 篇重复项`)
          } else {
            toastError("清理失败，请检查网络")
          }
        } catch {
          toastError("清理失败")
        }
        setDuplicates([])
        setDuplicateDialogOpen(false)
        fetchArticles()
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          {importHref && (
            <Link
              href={importHref}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 gap-2 px-4"
            >
              <Upload size={16} /> {importLabel || "导入"}
            </Link>
          )}
          <Link
            href={createHref}
            className="inline-flex items-center justify-center rounded-lg border-0 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 gap-2 px-4"
          >
            <Plus size={16} /> {createLabel}
          </Link>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 px-4 py-3 border-b border-border bg-background">
            <div className="lg:col-span-4 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索标题、正文、作者或标签"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm outline-none focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="lg:col-span-2 h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="review">待校审</option>
              <option value="published">已刊</option>
            </select>
            <input
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              placeholder="文体"
              className="lg:col-span-2 h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <input
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="标签"
              className="lg:col-span-2 h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <div className="lg:col-span-2 flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                重置
              </button>
              <button
                onClick={exportCsv}
                className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5"
              >
                <Download size={14} /> 导出
              </button>
            </div>
          </div>
          {/* 日期筛选 + 每页条数 */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background text-sm">
            <span className="text-xs text-muted-foreground shrink-0">导入时间:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-primary w-36"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-primary w-36"
            />
            <span className="text-xs text-muted-foreground ml-4 shrink-0">每页:</span>
            <select
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value={20}>20 篇</option>
              <option value={50}>50 篇</option>
              <option value={100}>100 篇</option>
              <option value={200}>200 篇</option>
            </select>
          </div>
          {/* Toolbar */}
          {filteredArticles.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 text-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {selected.size === filteredArticles.length ? (
                    <CheckSquare size={16} />
                  ) : (
                    <XSquare size={16} />
                  )}
                  {selected.size > 0 ? `已选 ${selected.size} 项` : "全选"}
                </button>
                <span className="text-xs text-muted-foreground">
                  第 {page}/{totalPages} 页，共 {total} 篇
                  {statusFilter !== "all" && `（${statusFilter === "draft" ? "草稿" : statusFilter === "review" ? "待校对" : "发布确认"}）`}
                </span>
                {batchProgress && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    处理中 {batchProgress.current}/{batchProgress.total}...
                  </span>
                )}
                {selected.size > 0 && !batchProgress && (
                  <>
                    <button
                      onClick={handleBatchPublish}
                      className="text-green hover:text-green/80 transition-colors"
                    >
                      批量发布
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="text-red hover:text-red/80 transition-colors"
                    >
                      批量删除
                    </button>
                    <button
                      onClick={handleBatchUnified}
                      disabled={batchUnifiedLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full transition-colors disabled:opacity-50 font-medium"
                    >
                      <Zap size={14} className={batchUnifiedLoading ? "animate-spin" : ""} />
                      {batchUnifiedLoading ? "处理中..." : "⚡一键AI"}
                    </button>
                    <button
                      onClick={handleBatchAiAssist}
                      disabled={batchAiAssistLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-700 bg-purple/10 hover:bg-purple/20 rounded-full transition-colors disabled:opacity-50"
                    >
                      <Loader2 size={14} className={batchAiAssistLoading ? "animate-spin" : ""} />
                      {batchAiAssistLoading ? "生成中..." : "AI辅助"}
                    </button>
                    <button
                      onClick={handleBatchPinyinCalibration}
                      disabled={batchPinyinLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors disabled:opacity-50"
                    >
                      <Loader2 size={14} className={batchPinyinLoading ? "animate-spin" : ""} />
                      {batchPinyinLoading ? "校准中..." : "AI拼音校准"}
                    </button>
                    <button
                      onClick={handleClearAiConfig}
                      disabled={batchClearAiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 bg-red/10 hover:bg-red/20 rounded-full transition-colors disabled:opacity-50"
                    >
                      <Loader2 size={14} className={batchClearAiLoading ? "animate-spin" : ""} />
                      {batchClearAiLoading ? "清除中..." : "清除AI"}
                    </button>
                    <button
                      onClick={handleClearPainting}
                      disabled={batchClearPaintingLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-600 bg-orange/10 hover:bg-orange/20 rounded-full transition-colors disabled:opacity-50"
                    >
                      <Loader2 size={14} className={batchClearPaintingLoading ? "animate-spin" : ""} />
                      {batchClearPaintingLoading ? "清除中..." : "清除配图"}
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDetectDuplicates}
                  disabled={detectingDuplicates}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-700 bg-amber/10 hover:bg-amber/20 rounded-full transition-colors disabled:opacity-50"
                >
                  <AlertTriangle size={14} />
                  {detectingDuplicates ? "检测中..." : "去重检测"}
                </button>
                <button
                  onClick={fetchArticles}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw size={14} /> 刷新
                </button>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border bg-muted/20">
            <span className="col-span-1">配图</span>
            <span className="col-span-3">标题</span>
            <span className="col-span-2">{col2Header}</span>
            <span className="col-span-2">导入时间</span>
            <span className="col-span-1">状态</span>
            <span className="col-span-1">标签</span>
            <span className="col-span-2 text-right">操作</span>
          </div>

          {articles.length === 0 ? (
            <EmptyState icon={PenLine} title={emptyText} />
          ) : (
            <div className="divide-y divide-border">
              {filteredArticles.map((a) => (
                <div
                  key={a.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 items-center text-sm transition-colors ${
                    selected.has(a.id) ? "bg-accent/5" : "hover:bg-muted/30"
                  }`}
                >
                  <span className="col-span-1">
                    {a.painting ? (
                      <div className="aspect-square w-10 h-10 rounded overflow-hidden border border-border">
                        <Image
                          src={a.painting.thumbnail || a.painting.url}
                          alt={a.painting.title}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        🖼️
                      </div>
                    )}
                  </span>
                  <span className="col-span-3 font-medium text-foreground truncate flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="rounded border-border shrink-0"
                    />
                    {a.title}
                  </span>
                  <span className="col-span-2 text-muted-foreground">{a[col2Key]}</span>
                  <span className="col-span-2 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="col-span-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.status === "published"
                          ? "bg-green/10 text-green"
                          : a.status === "review"
                          ? "bg-blue/10 text-blue"
                          : "bg-amber/10 text-amber"
                      }`}
                    >
                      {a.status === "published" ? "发布确认" : a.status === "review" ? "待校对" : "草稿"}
                    </span>
                  </span>
                  <span className="col-span-1 text-xs text-muted-foreground truncate">
                    {a.tags.slice(0, 2).join(" · ")}
                  </span>
                  <span className="col-span-2 flex items-center justify-end gap-1">
                    <a
                      href={`${previewHrefPrefix}/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                      title="预览"
                    >
                      <Eye size={14} />
                    </a>
                    <Link
                      href={`${editHrefPrefix}/${a.id}/edit`}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                      title="编辑"
                    >
                      <Pencil size={14} />
                    </Link>
                    {a.status !== "published" && (
                      <button
                        onClick={() => handlePublish(a.id)}
                        className="p-2 text-muted-foreground hover:text-green hover:bg-green/10 rounded-md transition-colors"
                        title="发布"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(a.id, a.title)}
                      className="p-2 text-muted-foreground hover:text-red hover:bg-red/10 rounded-md transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-sm">
            <span className="text-muted-foreground">
              显示 {articles.length} / {total} 篇
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-md border border-border disabled:opacity-50 hover:bg-background"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-md border border-border disabled:opacity-50 hover:bg-background"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 去重检测对话框 */}
      {duplicateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setDuplicateDialogOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                <h3 className="text-lg font-semibold">重复内容检测结果</h3>
              </div>
              <button
                onClick={() => setDuplicateDialogOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  检测到 {duplicates.length} 组相似文章（相似度 ≥ 85%）
                </p>
                <button
                  onClick={() => handleDeleteAllDuplicates()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  <Trash size={14} />
                  一键删除全部重复项
                </button>
              </div>
              
              <div className="space-y-3">
                {duplicates.map((pair, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        pair.type === "exact" 
                          ? "bg-red-100 text-red-700" 
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        相似度 {Math.round(pair.similarity * 100)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        {pair.type === "exact" ? "完全相同" : "相似"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <span className="text-xs text-gray-400">文章 1</span>
                        <p className="text-sm font-medium text-gray-900">{pair.title1}</p>
                      </div>
                      <ArrowRightLeft className="text-gray-400" size={16} />
                      <div className="flex-1">
                        <span className="text-xs text-gray-400">文章 2</span>
                        <p className="text-sm font-medium text-gray-900">{pair.title2}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMergeArticles(pair.id1, pair.id2, true)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green/10 hover:bg-green/20 rounded-md transition-colors"
                      >
                        <ArrowRightLeft size={12} />
                        保留「{pair.title1}」合并
                      </button>
                      <button
                        onClick={() => handleMergeArticles(pair.id1, pair.id2, false)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green/10 hover:bg-green/20 rounded-md transition-colors"
                      >
                        <ArrowRightLeft size={12} />
                        保留「{pair.title2}」合并
                      </button>
                      <button
                        onClick={() => handleDeleteDuplicate(pair.id1, pair.id2, true)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-700 bg-red/10 hover:bg-red/20 rounded-md transition-colors"
                      >
                        <Trash size={12} />
                        删除1
                      </button>
                      <button
                        onClick={() => handleDeleteDuplicate(pair.id1, pair.id2, false)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-700 bg-red/10 hover:bg-red/20 rounded-md transition-colors"
                      >
                        <Trash size={12} />
                        删除2
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
