"use client"

import { useState, useEffect } from "react"
import {
  X,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  XCircle,
  SkipForward,
  ChevronRight,
} from "lucide-react"

interface WorkflowStep {
  id: string
  name: string
  status: string
  order: number
  attempt: number
  maxAttempts: number
  output: string | null
  error: string | null
  durationMs: number | null
  createdAt: string
  updatedAt: string
}

interface WorkflowRun {
  id: string
  status: string
  progress: number
  policy: string
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  steps: WorkflowStep[]
}

interface Artifact {
  id: string
  type: string
  version: number
  confidence: number | null
  createdAt: string
}

interface Props {
  runId: string | null
  onClose: () => void
}

export function AiWorkflowTrace({ runId, onClose }: Props) {
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!runId) return
    async function fetchData() {
      setLoading(true)
      try {
        const [runRes, artRes] = await Promise.all([
          fetch(`/api/admin/ai-workflows/${runId}`),
          fetch(`/api/admin/ai-workflows/${runId}/artifacts`),
        ])
        const runData = await runRes.json()
        const artData = await artRes.json()
        if (runRes.ok) setRun(runData)
        if (artRes.ok) setArtifacts(artData.artifacts || [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [runId])

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed": return <CheckCircle2 size={16} className="text-green-600" />
      case "running": return <Loader2 size={16} className="text-amber-600 animate-spin" />
      case "queued": return <Clock size={16} className="text-sky-600" />
      case "failed": return <XCircle size={16} className="text-red-600" />
      case "skipped": return <SkipForward size={16} className="text-gray-400" />
      default: return <Clock size={16} className="text-gray-400" />
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "completed": return "bg-green-50 border-green-200"
      case "running": return "bg-amber-50 border-amber-200"
      case "queued": return "bg-sky-50 border-sky-200"
      case "failed": return "bg-red-50 border-red-200"
      case "skipped": return "bg-gray-50 border-gray-200"
      default: return "bg-gray-50 border-gray-200"
    }
  }

  function formatDuration(ms: number | null) {
    if (!ms) return "—"
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (!runId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">AI 轨迹</h3>
            {run && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusClass(run.status)}`}>
                {run.status}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : run ? (
            <div className="space-y-4">
              {/* Run meta */}
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">策略</div>
                  <div className="font-medium">{run.policy}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">进度</div>
                  <div className="font-medium">{run.progress}%</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">开始</div>
                  <div className="font-medium">{run.startedAt ? new Date(run.startedAt).toLocaleString("zh-CN") : "—"}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">完成</div>
                  <div className="font-medium">{run.completedAt ? new Date(run.completedAt).toLocaleString("zh-CN") : "—"}</div>
                </div>
              </div>

              {/* Steps timeline */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">执行步骤</h4>
                {run.steps.map((step) => (
                  <div
                    key={step.id}
                    className={`border rounded-lg p-3 ${getStatusClass(step.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(step.status)}
                        <span className="text-sm font-medium">{step.name}</span>
                        <span className="text-xs text-gray-500">
                          尝试 {step.attempt}/{step.maxAttempts}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        耗时 {formatDuration(step.durationMs)}
                      </div>
                    </div>
                    {step.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        {step.error}
                      </div>
                    )}
                    {step.output && !step.error && (
                      <div className="mt-2 text-xs text-gray-600">
                        <details>
                          <summary className="cursor-pointer hover:text-gray-900">查看输出</summary>
                          <pre className="mt-1 p-2 bg-white rounded border border-gray-200 overflow-x-auto max-h-32">
                            {step.output.slice(0, 500)}
                            {step.output.length > 500 ? "..." : ""}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Artifacts */}
              {artifacts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">产物版本</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {artifacts.map((art) => (
                      <div key={art.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{art.type}</span>
                          <span className="text-xs text-gray-500">v{art.version}</span>
                        </div>
                        {art.confidence !== null && (
                          <div className="text-xs text-gray-500 mt-1">
                            置信度 {Math.round(art.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">未找到任务信息</div>
          )}
        </div>
      </div>
    </div>
  )
}
