"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import NextImage from "next/image"
import { Sparkles, Loader2, Check, AlertCircle, Lightbulb, Image as ImageIcon, X } from "lucide-react"
import { useToast } from "@/components/admin/Toast"
import { useConfirm } from "@/components/admin/ConfirmDialog"
import { ARTICLE_TYPES, ARTICLE_STATUS } from "@/lib/constants"
import type { ArticleSource, ArticleStatus } from "@/lib/constants"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface AiSuggestion {
  category: string
  original: string
  suggestion: string
  confidence: number
  explanation: string
  applied: boolean
}

interface AiAnnotation {
  term: string
  explanation: string
  sourceTitle?: string
  sourceUrl?: string
  quote?: string
  confidence?: number
}

interface AiAnalysisResult {
  titleSuggestion: string
  typeSuggestion: string
  typeExplanation: string
  annotations: AiAnnotation[]
  translation: string
  appreciation: string
  tagSuggestions: string[]
  suggestions: AiSuggestion[]
}

interface AiReviewIssue {
  category: string
  severity: "low" | "medium" | "high"
  target: string
  detail: string
  suggestion: string
  field?: ReviewField
  original?: string
  replacement?: string
  applied?: boolean
}

type ReviewField = "title" | "author" | "type" | "dateRaw" | "preface" | "body"
  | "postscript" | "notes" | "annotations" | "translation" | "appreciation"

interface AiReviewReport {
  overall: "pass" | "review" | "risk"
  score: number
  summary: string
  issues: AiReviewIssue[]
  strengths: string[]
  publishAdvice: string
  generatedAt?: string
}

interface AiSourceMeta {
  evidenceStatus?: string
  promptVersion?: string
  aiTaskLogId?: string | null
  sourceCandidate?: {
    title?: string
    url?: string
    source?: string
    confidence?: number
    excerpt?: string
    body?: string
  }
}

interface ArticleFormData {
  title: string
  type: string
  author: string
  body: string
  dateRaw: string
  preface: string
  postscript: string
  notes: string
  tags: string
  status: ArticleStatus
  paintingId?: string
}

interface JiguFormData extends ArticleFormData {
  dynasty: string
  annotations: string
  translation: string
  appreciation: string
}

interface BaseProps {
  articleId?: string
  source: ArticleSource
}

interface ChuliProps extends BaseProps {
  source: "chuli"
  mode: "create" | "edit"
  initialData?: Partial<ArticleFormData>
}

interface JiguProps extends BaseProps {
  source: "jigu"
  mode: "edit"
  initialData?: Partial<JiguFormData>
}

type Props = ChuliProps | JiguProps

export function ArticleForm(props: Props) {
  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()
  const { confirm } = useConfirm()
  const isChuli = props.source === "chuli"
  const isEdit = props.mode === "edit"
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)

  const defaultForm: ArticleFormData = {
    title: "",
    type: "诗",
    author: isChuli ? "狂野君" : "佚名",
    body: "",
    dateRaw: "",
    preface: "",
    postscript: "",
    notes: "",
    tags: "",
    status: "draft",
  }

  const [form, setForm] = useState<ArticleFormData>(defaultForm)
  const [jiguFields, setJiguFields] = useState({
    dynasty: "",
    annotations: "",
    translation: "",
    appreciation: "",
  })
  const [jiguStructuredAnnotations, setJiguStructuredAnnotations] = useState<AiAnnotation[] | null>(null)
  const [aiAssisting, setAiAssisting] = useState(false)
  const [aiReviewing, setAiReviewing] = useState(false)
  const [chuliAiFields, setChuliAiFields] = useState({
    annotations: "",
    translation: "",
    appreciation: "",
    showAiFields: false,
  })
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null)
  const [aiReviewReport, setAiReviewReport] = useState<AiReviewReport | null>(null)
  const [aiSourceMeta, setAiSourceMeta] = useState<AiSourceMeta | null>(null)
  const [articleConfidence, setArticleConfidence] = useState<number | null>(null)

  const [aiPaintingMatching, setAiPaintingMatching] = useState(false)
  const [aiPaintingMatches, setAiPaintingMatches] = useState<Array<{
    id: string;
    title: string;
    artist: string | null;
    dynasty: string | null;
    url: string;
    thumbnail: string | null;
    description: string | null;
    relevance: number;
    matchReason: string;
    isNew: boolean;
  }>>([])
  const [generatingPinyin, setGeneratingPinyin] = useState(false)
  const [selectedPainting, setSelectedPainting] = useState<string | null>(null)
  const [failedPaintingIds, setFailedPaintingIds] = useState<Set<string>>(new Set())
  const [currentPainting, setCurrentPainting] = useState<{
    id: string;
    title: string;
    artist: string | null;
    dynasty: string | null;
    url: string;
    thumbnail: string | null;
    description: string | null;
  } | null>(null)
  const [showPaintingDialog, setShowPaintingDialog] = useState(false)
  const [paintingAnalysis, setPaintingAnalysis] = useState<{
    keywords: string[];
    theme: string;
    mood: string;
    matchReason: string;
  } | null>(null)

  const articleId = isEdit ? props.articleId : undefined
  const draftKey = `article-draft:${props.source}:${articleId || "new"}`

  useEffect(() => {
    if (!articleId) return

    fetch(`/api/admin/articles/${articleId}`)
      .then((r) => r.json())
      .then((detail) => {
        if (detail.error) return
        setForm({
          title: detail.title || "",
          type: detail.type || defaultForm.type,
          author: detail.author || defaultForm.author,
          body: detail.body || "",
          dateRaw: detail.dateRaw || "",
          preface: detail.preface || "",
          postscript: detail.postscript || "",
          notes: detail.notes || "",
          tags: (detail.tags || []).join(", "),
          status: detail.status || "draft",
          paintingId: detail.paintingId || undefined,
        })
        if (detail.paintingId) {
          setSelectedPainting(detail.paintingId)
        }
        if (detail.painting) {
          setCurrentPainting(detail.painting)
        }
        if (detail.reviewReport) {
          setAiReviewReport(parseReviewReport(detail.reviewReport))
        }
        if (typeof detail.confidence === "number") {
          setArticleConfidence(detail.confidence)
        }
        if (detail.rawContent) {
          setAiSourceMeta(parseAiSourceMeta(detail.rawContent))
        }
        if (!isChuli) {
          const parsedAnnotations = detail.annotations
            ? parseAnnotationsText(detail.annotations)
            : ""
          setJiguFields({
            dynasty: detail.dateRaw || "",
            annotations: parsedAnnotations,
            translation: detail.translation || "",
            appreciation: detail.appreciation || "",
          })
        } else {
          const parsedAnnotations = detail.annotations
            ? parseAnnotationsText(detail.annotations)
            : ""
          setChuliAiFields((prev) => ({
            ...prev,
            annotations: parsedAnnotations,
            translation: detail.translation || "",
            appreciation: detail.appreciation || "",
            showAiFields: !!(parsedAnnotations || detail.translation || detail.appreciation),
          }))
        }
        restoreLocalDraft()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, isChuli, defaultForm.author, defaultForm.type])

  useEffect(() => {
    if (isEdit) return
    restoreLocalDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!form.title && !form.body) return
    const timeout = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({
        form,
        jiguFields,
        chuliAiFields,
        savedAt: new Date().toISOString(),
      }))
      setDraftSavedAt(new Date().toISOString())
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [chuliAiFields, draftKey, form, jiguFields])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await saveArticle()
  }

  async function saveArticle(statusOverride?: ArticleStatus) {
    setSaving(true)
    setError("")

    try {
      const body: Record<string, unknown> = {
        title: form.title,
        author: form.author,
        body: form.body,
        status: statusOverride || form.status,
        tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
        paintingId: form.paintingId || null,
      }

      if (isChuli) {
        body.type = form.type
        body.dateRaw = form.dateRaw
        body.preface = form.preface
        body.postscript = form.postscript
        body.notes = form.notes
        if (chuliAiFields.showAiFields) {
          body.annotations = JSON.stringify(
            chuliAiFields.annotations
              .split("\n")
              .filter(Boolean)
              .map((line) => {
                const idx = line.search(/[：:]/);
                if (idx === -1) return { term: line.trim(), explanation: "" }
                return { term: line.slice(0, idx).trim(), explanation: line.slice(idx + 1).trim() }
              })
          )
          body.translation = chuliAiFields.translation || undefined
          body.appreciation = chuliAiFields.appreciation || undefined
        }
      } else {
        body.dateRaw = jiguFields.dynasty
        body.annotations = JSON.stringify(
          jiguStructuredAnnotations || jiguFields.annotations
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const [term, ...rest] = line.split(/[：:]/);
              return { term: term?.trim() || "", explanation: rest.join("：").trim() }
            })
        )
        body.translation = jiguFields.translation
        body.appreciation = jiguFields.appreciation
      }

      const url = isEdit ? `/api/admin/articles/${articleId}` : "/api/admin/articles"
      const method = isEdit ? "PUT" : "POST"

      if (!isEdit) {
        body.source = props.source
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        localStorage.removeItem(draftKey)
        router.push(isChuli ? "/admin/chuli" : "/admin/jigu")
      } else {
        const data = await res.json()
        const msg = data.error || "保存失败"
        setError(msg)
        toastError(msg)
      }
    } catch {
      const msg = "网络错误，请重试"
      setError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  function restoreLocalDraft() {
    const rawDraft = localStorage.getItem(draftKey)
    if (!rawDraft) return
    try {
      const draft = JSON.parse(rawDraft) as {
        form?: ArticleFormData
        jiguFields?: typeof jiguFields
        chuliAiFields?: typeof chuliAiFields
        savedAt?: string
      }
      if (draft.form) setForm((prev) => ({ ...prev, ...draft.form }))
      if (draft.jiguFields) setJiguFields((prev) => ({ ...prev, ...draft.jiguFields }))
      if (draft.chuliAiFields) setChuliAiFields((prev) => ({ ...prev, ...draft.chuliAiFields }))
      if (draft.savedAt) setDraftSavedAt(draft.savedAt)
    } catch {
      localStorage.removeItem(draftKey)
    }
  }

  function parseAiSourceMeta(raw: string): AiSourceMeta | null {
    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object") return null
      return parsed as AiSourceMeta
    } catch {
      return null
    }
  }

  async function handleAiAssist() {
    if (!form.body || !form.title) {
      const msg = "请先填写标题和正文"
      setError(msg)
      toastError(msg)
      return
    }
    setAiAssisting(true)
    setError("")

    try {
      const res = await fetch("/api/admin/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          author: form.author,
          body: form.body,
          dateRaw: form.dateRaw || undefined,
          preface: form.preface || undefined,
          postscript: form.postscript || undefined,
          notes: form.notes || undefined,
          sourceEvidence: aiSourceMeta?.evidenceStatus === "confirmed" ? aiSourceMeta.sourceCandidate : undefined,
        }),
      })

      if (res.ok) {
        const data: AiAnalysisResult = await res.json()
        setAiAnalysis(data)
        
        if (isChuli) {
          const annotText = Array.isArray(data.annotations)
            ? data.annotations.map((a: { term: string; explanation: string }) => `${a.term}：${a.explanation}`).join("\n")
            : data.annotations || ""
          const newChuliFields = {
            annotations: annotText,
            translation: data.translation || "",
            appreciation: data.appreciation || "",
            showAiFields: true,
          }
          setChuliAiFields(newChuliFields)
          
          let newTags = form.tags
          if (data.tagSuggestions && data.tagSuggestions.length > 0) {
            const currentTags = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
            newTags = [...new Set([...currentTags, ...data.tagSuggestions])].join(", ")
            setForm(prev => ({ ...prev, tags: newTags }))
          }
          
          await autoSaveAfterAi(newChuliFields, newTags)
        } else {
          const newJiguFields = {
            ...jiguFields,
            annotations: data.annotations?.map((a: { term: string; explanation: string }) => `${a.term}：${a.explanation}`).join("\n") || "",
            translation: data.translation || "",
            appreciation: data.appreciation || "",
          }
          setJiguFields(newJiguFields)
          setJiguStructuredAnnotations(data.annotations || [])
          
          let newTags = form.tags
          if (data.tagSuggestions && data.tagSuggestions.length > 0) {
            const currentTags = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
            newTags = [...new Set([...currentTags, ...data.tagSuggestions])].join(", ")
            setForm(prev => ({ ...prev, tags: newTags }))
          }
          
          await autoSaveAfterAi(newJiguFields, newTags, data.annotations)
        }
      } else {
        const data = await res.json()
        const msg = data.error || "AI 辅助生成失败"
        setError(msg)
        toastError(msg)
      }
    } catch {
      const msg = "网络错误，请重试"
      setError(msg)
      toastError(msg)
    } finally {
      setAiAssisting(false)
    }
  }

  async function autoSaveAfterAi(
    aiFields: typeof jiguFields | typeof chuliAiFields,
    newTags: string,
    structuredAnnotations?: AiAnnotation[]
  ) {
    if (!form.title || !form.body) return
    
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        author: form.author,
        type: form.type,
        body: form.body,
        dateRaw: isChuli ? form.dateRaw : (aiFields as typeof jiguFields).dynasty,
        preface: form.preface,
        postscript: form.postscript,
        notes: form.notes,
        tags: newTags,
        status: form.status,
        paintingId: form.paintingId || null,
      }

      if (!isChuli) {
        const jiguData = aiFields as typeof jiguFields
        body.annotations = JSON.stringify(
          structuredAnnotations || jiguData.annotations
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const [term, ...rest] = line.split(/[：:]/);
              return { term: term?.trim() || "", explanation: rest.join("：").trim() }
            })
        )
        body.translation = jiguData.translation
        body.appreciation = jiguData.appreciation
      }

      const url = isEdit ? `/api/admin/articles/${articleId}` : "/api/admin/articles"
      const method = isEdit ? "PUT" : "POST"

      if (!isEdit) {
        body.source = props.source
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const result = await res.json()
        if (result.id && !articleId) {
          const newUrl = `/admin/jigu/${result.id}/edit`
          router.replace(newUrl)
        }
      }
    } catch (e) {
      console.error("Auto-save failed:", e)
    }
  }

  async function handleGeneratePinyin() {
    if (!articleId) {
      const msg = "请先保存文章"
      setError(msg)
      toastError(msg)
      return
    }
    if (!form.body || !form.title) {
      const msg = "请先填写标题和正文"
      setError(msg)
      toastError(msg)
      return
    }
    setGeneratingPinyin(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/articles/${articleId}/pinyin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (res.ok) {
        const data = await res.json()
        const uncertainText = data.uncertainCount > 0 ? `，待复核 ${data.uncertainCount} 项` : ""
        toastSuccess(`拼音语境校准完成：修正 ${data.correctionCount || 0} 项${uncertainText}`)
      } else {
        const data = await res.json()
        const msg = data.error || "拼音生成失败"
        setError(msg)
        toastError(msg)
      }
    } catch {
      const msg = "网络错误，请重试"
      setError(msg)
      toastError(msg)
    } finally {
      setGeneratingPinyin(false)
    }
  }

  async function handleAiReview() {
    if (!articleId) {
      const msg = "请先保存草稿，再生成校审报告"
      setError(msg)
      toastError(msg)
      return
    }
    if (!form.body || !form.title) {
      const msg = "请先填写标题和正文"
      setError(msg)
      toastError(msg)
      return
    }

    setAiReviewing(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/articles/${articleId}/review-report`, {
        method: "POST",
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setAiReviewReport(data.data)
        setForm((prev) => prev.status === "published" ? prev : { ...prev, status: "review" })
        toastSuccess("AI 校审报告已生成")
      } else {
        const msg = data.error || "AI 校审失败"
        setError(msg)
        toastError(msg)
      }
    } catch {
      const msg = "网络错误，请重试"
      setError(msg)
      toastError(msg)
    } finally {
      setAiReviewing(false)
    }
  }

  function getReviewValues(): Record<ReviewField, string> {
    return {
      title: form.title,
      author: form.author,
      type: form.type,
      dateRaw: isChuli ? form.dateRaw : jiguFields.dynasty,
      preface: form.preface,
      body: form.body,
      postscript: form.postscript,
      notes: form.notes,
      annotations: isChuli ? chuliAiFields.annotations : jiguFields.annotations,
      translation: isChuli ? chuliAiFields.translation : jiguFields.translation,
      appreciation: isChuli ? chuliAiFields.appreciation : jiguFields.appreciation,
    }
  }

  function isReviewIssueApplicable(issue: AiReviewIssue, values = getReviewValues()) {
    return Boolean(
      issue.field &&
      issue.original &&
      issue.replacement &&
      issue.original !== issue.replacement &&
      values[issue.field].includes(issue.original)
    )
  }

  function applyReviewIssues(indexes: number[]) {
    if (!aiReviewReport) return

    const values = getReviewValues()
    const appliedIndexes: number[] = []
    for (const index of indexes) {
      const issue = aiReviewReport.issues[index]
      if (!issue || !isReviewIssueApplicable(issue, values) || !issue.field || !issue.original || issue.replacement === undefined) continue
      values[issue.field] = values[issue.field].replace(issue.original, issue.replacement)
      appliedIndexes.push(index)
    }

    if (appliedIndexes.length === 0) {
      toastError("没有可直接匹配替换的校审建议，请重新生成报告或人工修改")
      return
    }

    setForm((prev) => ({
      ...prev,
      title: values.title,
      author: values.author,
      type: values.type,
      dateRaw: isChuli ? values.dateRaw : prev.dateRaw,
      preface: values.preface,
      body: values.body,
      postscript: values.postscript,
      notes: values.notes,
    }))

    if (isChuli) {
      setChuliAiFields((prev) => ({
        ...prev,
        annotations: values.annotations,
        translation: values.translation,
        appreciation: values.appreciation,
        showAiFields: true,
      }))
    } else {
      setJiguFields((prev) => ({
        ...prev,
        dynasty: values.dateRaw,
        annotations: values.annotations,
        translation: values.translation,
        appreciation: values.appreciation,
      }))
      setJiguStructuredAnnotations(null)
    }

    setAiReviewReport((prev) => prev ? {
      ...prev,
      issues: prev.issues.map((issue, index) => appliedIndexes.includes(index) ? { ...issue, applied: true } : issue),
    } : prev)
    toastSuccess(`已采纳 ${appliedIndexes.length} 条建议，请确认后保存`)
  }

  async function handleAiPaintMatch() {
    if (!form.body || !form.title) {
      const msg = "请先填写标题和正文"
      setError(msg)
      toastError(msg)
      return
    }
    setAiPaintingMatching(true)
    setError("")
    setShowPaintingDialog(true)

    try {
      const res = await fetch("/api/admin/paintings/ai-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          tags: form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
          count: 4,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setAiPaintingMatches(data.matches || [])
        setPaintingAnalysis(data.analysis || null)
      } else {
        let msg = "AI 配图匹配失败"
        try {
          const err = await res.json()
          msg = err.error || msg
        } catch {
          msg = `服务器错误 (${res.status})`
        }
        setError(msg)
        toastError(msg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "网络错误，请重试"
      setError(msg)
      toastError(msg)
    } finally {
      setAiPaintingMatching(false)
    }
  }

  const update = (key: keyof ArticleFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "集校编辑" : isChuli ? "新建文章" : "编辑"}
          {!isChuli && <span className="text-muted-foreground text-lg ml-2">· 辑古录</span>}
        </h1>
        {draftSavedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            本地草稿已暂存：{new Date(draftSavedAt).toLocaleTimeString("zh-CN")}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="输入文章标题"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">{isChuli ? "类型" : "状态"}</Label>
            {isChuli ? (
              <select
                id="type"
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ARTICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ) : (
              <select
                id="type"
                value={form.status}
                onChange={(e) => update("status", e.target.value as ArticleStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ARTICLE_STATUS.map((s) => (
                  <option key={s} value={s}>{s === "draft" ? "草稿" : s === "review" ? "待校审" : "已刊"}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Author and Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="author">作者</Label>
            <Input
              id="author"
              value={form.author}
              onChange={(e) => update("author", e.target.value)}
              placeholder="作者名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">{isChuli ? "创作日期" : "朝代"}</Label>
            <Input
              id="date"
              value={isChuli ? form.dateRaw : jiguFields.dynasty}
              onChange={(e) =>
                isChuli
                  ? update("dateRaw", e.target.value)
                  : setJiguFields({ ...jiguFields, dynasty: e.target.value })
              }
              placeholder={isChuli ? "如：2024年秋" : "如：唐"}
            />
          </div>
        </div>

        {isChuli && (
          <>
            {/* Preface */}
            <div className="space-y-2">
              <Label htmlFor="preface">序</Label>
              <Textarea
                id="preface"
                value={form.preface}
                onChange={(e) => update("preface", e.target.value)}
                rows={2}
                className="font-kai"
                placeholder="文章前言或背景说明..."
              />
            </div>

            {/* Body with AI Assist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">正文</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAiAssist}
                    disabled={aiAssisting || !form.body}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-accent/30 text-accent rounded-md hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiAssisting ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> AI 分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} /> AI 辅助生成
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePinyin}
                    disabled={generatingPinyin || !form.body || !articleId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green/30 text-green-600 rounded-md hover:bg-green/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingPinyin ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> 生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} /> AI校准拼音
                      </>
                    )}
                  </button>
                </div>
              </div>
              <Textarea
                id="body"
                required
                value={form.body}
                onChange={(e) => update("body", e.target.value)}
                rows={14}
                className="font-serif text-base leading-relaxed min-h-[200px]"
                placeholder="输入诗文正文..."
              />
            </div>

            {/* AI Generated Fields */}
            {chuliAiFields.showAiFields && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles size={14} />
                  AI 智能分析结果
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annotations">注释</Label>
                  <Textarea
                    id="annotations"
                    value={chuliAiFields.annotations}
                    onChange={(e) =>
                      setChuliAiFields({ ...chuliAiFields, annotations: e.target.value })
                    }
                    rows={5}
                    placeholder="词条：解释"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="translation">译文</Label>
                  <Textarea
                    id="translation"
                    value={chuliAiFields.translation}
                    onChange={(e) =>
                      setChuliAiFields({ ...chuliAiFields, translation: e.target.value })
                    }
                    rows={4}
                    placeholder="现代汉语翻译..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appreciation">赏析</Label>
                  <Textarea
                    id="appreciation"
                    value={chuliAiFields.appreciation}
                    onChange={(e) =>
                      setChuliAiFields({ ...chuliAiFields, appreciation: e.target.value })
                    }
                    rows={4}
                    placeholder="文章赏析与解读..."
                  />
                </div>

                {/* AI 改进建议 */}
                {aiAnalysis && (aiAnalysis.titleSuggestion || aiAnalysis.typeSuggestion || aiAnalysis.suggestions.length > 0) && (
                  <div className="mt-6 space-y-4">
                    <Separator className="my-4" />
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Lightbulb size={14} className="text-amber-500" />
                      AI 改进建议
                    </div>

                    {/* 标题建议 */}
                    {aiAnalysis.titleSuggestion && aiAnalysis.titleSuggestion !== form.title && (
                      <div className="p-3 bg-amber/10 rounded-lg border border-amber/20">
                        <div className="text-xs text-amber-700 font-medium mb-1">标题优化建议</div>
                        <div className="text-sm text-ink-600">
                          <span className="text-ink-400">当前：</span>{form.title}
                        </div>
                        <div className="text-sm mt-1">
                          <span className="text-amber-600">建议：</span>{aiAnalysis.titleSuggestion}
                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, title: aiAnalysis.titleSuggestion }))
                            }}
                            className="ml-2 text-xs px-2 py-0.5 bg-amber/20 text-amber-700 rounded hover:bg-amber/30 transition-colors"
                          >
                            采纳
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 文体建议 */}
                    {aiAnalysis.typeSuggestion && (
                      <div className="p-3 bg-blue/10 rounded-lg border border-blue/20">
                        <div className="text-xs text-blue-700 font-medium mb-1">文体判定</div>
                        <div className="text-sm">
                          <span className="text-blue-600">判定结果：</span>{aiAnalysis.typeSuggestion}
                        </div>
                        {aiAnalysis.typeExplanation && (
                          <div className="text-xs text-ink-500 mt-1">
                            依据：{aiAnalysis.typeExplanation}
                          </div>
                        )}
                        {aiAnalysis.typeSuggestion !== form.type && (
                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, type: aiAnalysis.typeSuggestion }))
                            }}
                            className="ml-2 text-xs px-2 py-0.5 bg-blue/20 text-blue-700 rounded hover:bg-blue/30 transition-colors"
                          >
                            采纳
                          </button>
                        )}
                      </div>
                    )}

                    {/* 修改建议列表 */}
                    {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-ink-500 font-medium">内容改进建议</div>
                        {aiAnalysis.suggestions.map((suggestion, index) => (
                          <div key={index} className="p-3 bg-rose/5 rounded-lg border border-rose/10">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.category}
                                </Badge>
                                <span className="text-xs text-ink-400">
                                  置信度：{(suggestion.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({
                                    ...prev,
                                    body: prev.body.replace(suggestion.original, suggestion.suggestion)
                                  }))
                                }}
                                className="text-xs px-2 py-0.5 bg-rose/20 text-rose-700 rounded hover:bg-rose/30 transition-colors"
                              >
                                <Check size={12} className="inline mr-1" />采纳
                              </button>
                            </div>
                            <div className="text-sm">
                              <span className="text-ink-400">原文：</span>
                              <span className="line-through text-ink-500">{suggestion.original}</span>
                            </div>
                            <div className="text-sm mt-1">
                              <span className="text-rose-600">修改为：</span>
                              <span className="font-medium">{suggestion.suggestion}</span>
                            </div>
                            <div className="text-xs text-ink-400 mt-1">
                              理由：{suggestion.explanation}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Postscript and Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postscript">跋</Label>
                <Textarea
                  id="postscript"
                  value={form.postscript}
                  onChange={(e) => update("postscript", e.target.value)}
                  rows={2}
                  className="font-kai"
                  placeholder="文章结尾..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={2}
                  placeholder="其他备注信息..."
                />
              </div>
            </div>
          </>
        )}

        {!isChuli && (
          <>
            {/* Body with AI Assist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">正文</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAiAssist}
                    disabled={aiAssisting || !form.body}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-accent/30 text-accent rounded-md hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiAssisting ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> AI 分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} /> AI 补全
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePinyin}
                    disabled={generatingPinyin || !form.body || !articleId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green/30 text-green-600 rounded-md hover:bg-green/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingPinyin ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> 生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} /> AI校准拼音
                      </>
                    )}
                  </button>
                </div>
              </div>
              <Textarea
                id="body"
                required
                value={form.body}
                onChange={(e) => update("body", e.target.value)}
                rows={16}
                className="font-serif text-base leading-relaxed"
                placeholder="输入古籍正文..."
              />
            </div>

            {/* Jigu Fields */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-2">
                <Label htmlFor="annotations">注释（每行一条，格式：词条：解释）</Label>
                <Textarea
                  id="annotations"
                  value={jiguFields.annotations}
                  onChange={(e) => {
                    setJiguStructuredAnnotations(null)
                    setJiguFields({ ...jiguFields, annotations: e.target.value })
                  }}
                  rows={6}
                  placeholder="豫章：今江西南昌&#10;郡守：地方行政长官"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="translation">译文</Label>
                <Textarea
                  id="translation"
                  value={jiguFields.translation}
                  onChange={(e) => setJiguFields({ ...jiguFields, translation: e.target.value })}
                  rows={6}
                  placeholder="现代汉语翻译..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appreciation">赏析</Label>
                <Textarea
                  id="appreciation"
                  value={jiguFields.appreciation}
                  onChange={(e) => setJiguFields({ ...jiguFields, appreciation: e.target.value })}
                  rows={6}
                  placeholder="文章赏析与解读..."
                />
              </div>

              {/* AI 改进建议 */}
              {aiAnalysis && (aiAnalysis.titleSuggestion || aiAnalysis.typeSuggestion || aiAnalysis.suggestions.length > 0) && (
                <div className="mt-6 space-y-4">
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Lightbulb size={14} className="text-amber-500" />
                    AI 改进建议
                  </div>

                  {/* 标题建议 */}
                  {aiAnalysis.titleSuggestion && aiAnalysis.titleSuggestion !== form.title && (
                    <div className="p-3 bg-amber/10 rounded-lg border border-amber/20">
                      <div className="text-xs text-amber-700 font-medium mb-1">标题优化建议</div>
                      <div className="text-sm text-ink-600">
                        <span className="text-ink-400">当前：</span>{form.title}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="text-amber-600">建议：</span>{aiAnalysis.titleSuggestion}
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, title: aiAnalysis.titleSuggestion }))
                          }}
                          className="ml-2 text-xs px-2 py-0.5 bg-amber/20 text-amber-700 rounded hover:bg-amber/30 transition-colors"
                        >
                          采纳
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 文体建议 */}
                  {aiAnalysis.typeSuggestion && (
                    <div className="p-3 bg-blue/10 rounded-lg border border-blue/20">
                      <div className="text-xs text-blue-700 font-medium mb-1">文体判定</div>
                      <div className="text-sm">
                        <span className="text-blue-600">判定结果：</span>{aiAnalysis.typeSuggestion}
                      </div>
                      {aiAnalysis.typeExplanation && (
                        <div className="text-xs text-ink-500 mt-1">
                          依据：{aiAnalysis.typeExplanation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 修改建议列表 */}
                  {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-ink-500 font-medium">内容改进建议</div>
                      {aiAnalysis.suggestions.map((suggestion, index) => (
                        <div key={index} className="p-3 bg-rose/5 rounded-lg border border-rose/10">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {suggestion.category}
                              </Badge>
                              <span className="text-xs text-ink-400">
                                置信度：{(suggestion.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setForm(prev => ({
                                  ...prev,
                                  body: prev.body.replace(suggestion.original, suggestion.suggestion)
                                }))
                              }}
                              className="text-xs px-2 py-0.5 bg-rose/20 text-rose-700 rounded hover:bg-rose/30 transition-colors"
                            >
                              <Check size={12} className="inline mr-1" />采纳
                            </button>
                          </div>
                          <div className="text-sm">
                            <span className="text-ink-400">原文：</span>
                            <span className="line-through text-ink-500">{suggestion.original}</span>
                          </div>
                          <div className="text-sm mt-1">
                            <span className="text-rose-600">修改为：</span>
                            <span className="font-medium">{suggestion.suggestion}</span>
                          </div>
                          <div className="text-xs text-ink-400 mt-1">
                            理由：{suggestion.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tags and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tags">标签</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder="秋天, 闲适, 山居"
            />
            <button
              type="button"
              onClick={handleAiPaintMatch}
              disabled={aiPaintingMatching}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 disabled:opacity-50"
            >
              {aiPaintingMatching ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ImageIcon size={12} />
              )}
              AI 配图
            </button>

            {/* Current Selected Painting Preview */}
            {currentPainting && (
              <div className="mt-4 border border-border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <NextImage
                      src={currentPainting.thumbnail || currentPainting.url}
                      alt={currentPainting.title}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-md bg-muted"
                    />
                    <div>
                      <p className="text-sm font-medium">{currentPainting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {currentPainting.artist || "佚名"}
                        {currentPainting.dynasty && ` · ${currentPainting.dynasty}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, paintingId: undefined }))
                      setCurrentPainting(null)
                      setSelectedPainting(null)
                      toastSuccess("已取消配图")
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-rose-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          {isChuli && (
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => update("status", e.target.value as ArticleStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="draft">草稿</option>
                <option value="review">待校对</option>
                <option value="published">发布确认</option>
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 text-sm text-red bg-red/10 rounded-md border border-red/20">
            {error}
          </div>
        )}

        {(aiSourceMeta || articleConfidence !== null) && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <h2 className="text-sm font-medium text-foreground">AI 来源与证据</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              {articleConfidence !== null && (
                <p>置信度：{Math.round(articleConfidence * 100)}%</p>
              )}
              {aiSourceMeta?.promptVersion && (
                <p>Prompt：{aiSourceMeta.promptVersion}</p>
              )}
              {aiSourceMeta?.evidenceStatus && (
                <p>证据状态：{aiSourceMeta.evidenceStatus === "confirmed" ? "已确认来源" : aiSourceMeta.evidenceStatus}</p>
              )}
              {aiSourceMeta?.aiTaskLogId && (
                <p>任务日志：{aiSourceMeta.aiTaskLogId}</p>
              )}
            </div>
            {aiSourceMeta?.sourceCandidate && (
              <div className="text-xs text-muted-foreground">
                <p className="text-foreground">{aiSourceMeta.sourceCandidate.title || "未命名来源"}</p>
                {aiSourceMeta.sourceCandidate.url && (
                  <a
                    href={aiSourceMeta.sourceCandidate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent no-underline"
                  >
                    {aiSourceMeta.sourceCandidate.url}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-foreground">AI 校审报告</h2>
              <p className="text-xs text-muted-foreground mt-1">
                检查错字、断句、注释、译文、赏析与发布风险
              </p>
            </div>
            <button
              type="button"
              onClick={handleAiReview}
              disabled={aiReviewing || !articleId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-accent/30 text-accent rounded-md hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiReviewing ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> 校审中...
                </>
              ) : (
                <>
                  <Sparkles size={12} /> 生成校审报告
                </>
              )}
            </button>
          </div>

          {aiReviewReport ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={cn(
                  "text-xs",
                  aiReviewReport.overall === "pass" && "border-green/30 text-green-700",
                  aiReviewReport.overall === "review" && "border-amber/30 text-amber-700",
                  aiReviewReport.overall === "risk" && "border-rose/30 text-rose-700"
                )}>
                  {aiReviewReport.overall === "pass" ? "可发布" : aiReviewReport.overall === "risk" ? "高风险" : "需复核"}
                </Badge>
                <span className="text-sm font-medium text-foreground">{aiReviewReport.score} 分</span>
                {aiReviewReport.generatedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(aiReviewReport.generatedAt).toLocaleString("zh-CN")}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{aiReviewReport.summary}</p>

              {aiReviewReport.issues.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-muted-foreground">问题清单</div>
                    {aiReviewReport.issues.some((issue) => isReviewIssueApplicable(issue)) && (
                      <button
                        type="button"
                        onClick={() => applyReviewIssues(aiReviewReport.issues.map((_, index) => index))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-accent/30 text-accent rounded-md hover:bg-accent/5"
                      >
                        <Check size={12} /> 一键采纳可替换项
                      </button>
                    )}
                  </div>
                  {aiReviewReport.issues.map((issue, index) => (
                    <div key={index} className="rounded-md border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                          <span className={cn(
                            "text-xs",
                            issue.severity === "high" && "text-rose-600",
                            issue.severity === "medium" && "text-amber-700",
                            issue.severity === "low" && "text-muted-foreground"
                          )}>
                            {issue.severity === "high" ? "高" : issue.severity === "medium" ? "中" : "低"}风险
                          </span>
                          {issue.target && <span className="text-xs text-muted-foreground">位置：{issue.target}</span>}
                        </div>
                        {issue.applied ? (
                          <span className="text-xs text-green-700">已采纳</span>
                        ) : isReviewIssueApplicable(issue) ? (
                          <button
                            type="button"
                            onClick={() => applyReviewIssues([index])}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent/5 rounded"
                          >
                            <Check size={12} /> 采纳替换
                          </button>
                        ) : null}
                      </div>
                      {issue.detail && <p className="text-sm text-foreground">{issue.detail}</p>}
                      {issue.suggestion && <p className="text-xs text-muted-foreground mt-1">建议：{issue.suggestion}</p>}
                      {issue.field && issue.original && issue.replacement && (
                        <div className="mt-2 text-xs space-y-1">
                          <p><span className="text-muted-foreground">原文：</span><span className="line-through">{issue.original}</span></p>
                          <p><span className="text-muted-foreground">替换为：</span>{issue.replacement}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-green/20 bg-green/5 p-3 text-sm text-green-700">
                  <Check size={14} /> 暂未发现明显问题，仍建议发布前人工通读。
                </div>
              )}

              {aiReviewReport.strengths.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">可保留之处</div>
                  <div className="flex flex-wrap gap-2">
                    {aiReviewReport.strengths.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-md border border-amber/20 bg-amber/5 p-3 text-sm text-amber-900">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{aiReviewReport.publishAdvice}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              文章保存后即可生成报告；AI 只做副编辑，最终刊发仍以人工校定为准。
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">实时预览</h2>
            <span className="text-xs text-muted-foreground">正文、序跋、注释、译文与赏析</span>
          </div>
          <article className="bg-background rounded-md border border-border p-4 font-serif leading-relaxed">
            <h3 className="text-xl text-foreground mb-1">{form.title || "未题"}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {[form.author, isChuli ? form.dateRaw : jiguFields.dynasty, form.type].filter(Boolean).join(" · ")}
            </p>
            {form.preface && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">序：{form.preface}</p>}
            <div className="whitespace-pre-wrap text-base text-foreground">{form.body || "正文尚未落笔"}</div>
            {form.postscript && <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">跋：{form.postscript}</p>}
            {(isChuli ? chuliAiFields.annotations : jiguFields.annotations) && (
              <div className="mt-5 pt-4 border-t border-border">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">注释</h4>
                <div className="space-y-1 text-sm">
                  {(isChuli ? chuliAiFields.annotations : jiguFields.annotations)
                    .split("\n")
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                </div>
              </div>
            )}
            {(isChuli ? chuliAiFields.translation : jiguFields.translation) && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">译文</h4>
                <p className="text-sm whitespace-pre-wrap">{isChuli ? chuliAiFields.translation : jiguFields.translation}</p>
              </div>
            )}
            {(isChuli ? chuliAiFields.appreciation : jiguFields.appreciation) && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">赏析</h4>
                <p className="text-sm whitespace-pre-wrap">{isChuli ? chuliAiFields.appreciation : jiguFields.appreciation}</p>
              </div>
            )}
          </article>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => saveArticle("draft")}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg border-0 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 gap-2 px-6 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> 保存中...
              </>
            ) : (
              "保存草稿"
            )}
          </button>
          <button
            type="button"
            onClick={() => saveArticle("review")}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 px-6 disabled:opacity-50"
          >
            提交校审
          </button>
          <button
            type="button"
            onClick={() => saveArticle("published")}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg border-0 bg-green text-white hover:bg-green/90 text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 px-6 disabled:opacity-50"
          >
            发布
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-9 px-6"
          >
            取消
          </button>
        </div>
      </form>

      {showPaintingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-medium">AI 智能配图推荐</h3>
                {paintingAnalysis && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    检索词：{paintingAnalysis.keywords.join("、")}
                    · 主题：{paintingAnalysis.theme}
                    · 氛围：{paintingAnalysis.mood}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowPaintingDialog(false)
                  setAiPaintingMatches([])
                  setPaintingAnalysis(null)
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {aiPaintingMatching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">AI 正在分析诗文并匹配配图...</span>
                </div>
              ) : aiPaintingMatches.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {aiPaintingMatches.map((painting) => (
                    <div
                      key={painting.id}
                      onClick={() => setSelectedPainting(painting.id)}
                      className={cn(
                        "relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden",
                        selectedPainting === painting.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="aspect-[4/3] bg-muted relative">
                        {(painting.thumbnail || painting.url) && !failedPaintingIds.has(painting.id) ? (
                          <NextImage
                            src={painting.thumbnail || painting.url}
                            alt={painting.title}
                            fill
                            sizes="(max-width: 768px) 50vw, 360px"
                            className="w-full h-full object-cover"
                            onError={() => {
                              setFailedPaintingIds(prev => new Set(prev).add(painting.id))
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                            <div className="text-center p-4">
                              <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                              <p className="text-xs truncate max-w-[120px]">{painting.title}</p>
                              <p className="text-[10px] text-muted-foreground/80">
                                {[painting.artist || "佚名", painting.dynasty].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedPainting === painting.id && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm truncate">{painting.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {painting.artist || "佚名"} {painting.dynasty && `· ${painting.dynasty}`}
                        </p>
                        <p className="text-xs text-violet-600 mt-1">{painting.matchReason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  暂无匹配的配图，请尝试其他内容
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setShowPaintingDialog(false)
                  setAiPaintingMatches([])
                  setPaintingAnalysis(null)
                  setSelectedPainting(null)
                }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (selectedPainting) {
                    try {
                      const res = await fetch(`/api/admin/paintings/${selectedPainting}`)
                      if (res.ok) {
                        const painting = await res.json()
                        setForm(prev => ({ ...prev, paintingId: selectedPainting }))
                        setCurrentPainting(painting)
                        toastSuccess("已选择配图")
                      }
                    } catch {
                      toastError("选择配图失败")
                    }
                  }
                  setShowPaintingDialog(false)
                }}
                disabled={!selectedPainting}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function parseAnnotationsText(raw: unknown): string {
  if (typeof raw === "string") {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        return arr.map((a: { term: string; explanation: string }) => `${a.term}：${a.explanation}`).join("\n")
      }
    } catch { /* fallthrough */ }
  }
  if (Array.isArray(raw)) {
    return (raw as { term: string; explanation: string }[])
      .map((a) => `${a.term}：${a.explanation}`).join("\n")
  }
  return ""
}

function parseReviewReport(raw: unknown): AiReviewReport | null {
  const data = typeof raw === "string" ? safeJsonParse(raw) : raw
  if (!data || typeof data !== "object") return null

  const report = data as Partial<AiReviewReport>
  const overall = report.overall === "pass" || report.overall === "risk" ? report.overall : "review"
  const score = typeof report.score === "number" ? report.score : 0
  const issues = Array.isArray(report.issues) ? report.issues : []
  const strengths = Array.isArray(report.strengths) ? report.strengths : []

  return {
    overall,
    score,
    summary: typeof report.summary === "string" ? report.summary : "校审报告已生成。",
    issues: issues.filter((item): item is AiReviewIssue => !!item && typeof item === "object"),
    strengths: strengths.filter((item): item is string => typeof item === "string"),
    publishAdvice: typeof report.publishAdvice === "string" ? report.publishAdvice : "建议人工复核后发布。",
    generatedAt: typeof report.generatedAt === "string" ? report.generatedAt : undefined,
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
