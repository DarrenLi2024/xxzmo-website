"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface AiWorkflowStats {
  queued: number
  running: number
  review: number
  ready: number
  failed: number
  total: number
}

interface EnqueueResult {
  batchId: string
  queued: number
  failed: number
  message?: string
}

interface UseAiWorkflowOptions {
  /** Poll interval in ms (default 30000) */
  pollIntervalMs?: number
  /** Auto-kick worker when queue has pending items (default true) */
  autoKick?: boolean
}

export function useAiWorkflow(options: UseAiWorkflowOptions = {}) {
  const { pollIntervalMs = 30000, autoKick = true } = options
  const [stats, setStats] = useState<AiWorkflowStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [kicking, setKicking] = useState(false)
  const lastKickAt = useRef(0)

  const fetchStats = useCallback(async () => {
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
  }, [])

  const kickWorker = useCallback(async (maxRuns = 3) => {
    setKicking(true)
    try {
      const res = await fetch("/api/admin/ai-workflows/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxRuns }),
      })
      const data = await res.json()
      await fetchStats()
      return { ok: res.ok, claimed: data.claimed ?? 0, error: data.error as string | undefined }
    } finally {
      setKicking(false)
    }
  }, [fetchStats])

  const enqueueArticles = useCallback(async (
    articleIds: string[],
    source?: string,
    policy?: string
  ): Promise<EnqueueResult & { ok: boolean; error?: string }> => {
    const res = await fetch("/api/admin/ai-workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleIds, source, policy }),
    })
    const data = await res.json()
    if (res.ok) {
      await fetchStats()
    }
    return {
      ok: res.ok,
      batchId: data.batchId ?? "",
      queued: data.queued ?? 0,
      failed: data.failed ?? 0,
      message: data.message,
      error: data.error,
    }
  }, [fetchStats])

  const retryRun = useCallback(async (runId: string) => {
    const res = await fetch(`/api/admin/ai-workflows/${runId}/retry`, { method: "POST" })
    if (res.ok) {
      await kickWorker(1)
      await fetchStats()
    }
    return res.ok
  }, [fetchStats, kickWorker])

  const findLatestRun = useCallback(async (articleId: string) => {
    const res = await fetch(`/api/admin/ai-workflows?articleId=${articleId}`)
    const data = await res.json()
    return data.runs?.[0] ?? null
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, pollIntervalMs)
    return () => clearInterval(interval)
  }, [fetchStats, pollIntervalMs])

  // Auto-kick: when queue has items and worker isn't busy, nudge processing
  useEffect(() => {
    if (!autoKick || !stats || kicking) return
    if (stats.queued <= 0) return
    if (stats.running >= 3) return

    const now = Date.now()
    if (now - lastKickAt.current < 15000) return
    lastKickAt.current = now

    void kickWorker(Math.min(stats.queued, 3))
  }, [autoKick, stats, kicking, kickWorker])

  return {
    stats,
    loading,
    kicking,
    fetchStats,
    kickWorker,
    enqueueArticles,
    retryRun,
    findLatestRun,
  }
}
