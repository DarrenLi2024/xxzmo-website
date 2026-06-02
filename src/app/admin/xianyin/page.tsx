"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText, Tag, Trash2, Sparkles, Copy, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

// ============================================================
// 类型定义
// ============================================================
interface ParsedArticle {
  id: string;
  title: string;
  body: string;
  type: string;
  subType?: string;
  preface?: string;
  postscript?: string;
  confidence: number;
  classificationReasons?: string[];
  selected: boolean;
}

const WRITE_MODES = [
  { value: "generate", label: "AI 生成", desc: "根据想法创作完整诗文" },
  { value: "rewrite", label: "改写", desc: "用不同风格重写" },
  { value: "expand", label: "扩写", desc: "将短句扩展为篇章" },
  { value: "continue", label: "续写", desc: "根据开头续写" },
  { value: "polish", label: "润色", desc: "优化用词和韵律" },
  { value: "tuijiao", label: "推敲", desc: "逐字推敲给建议" },
] as const;

const TYPES = ["诗", "词", "文", "赋", "随笔", "日记", "对联"] as const;

const EXAMPLE = `秋日午后口占一首

秋风起兮白云飞，
草木黄落兮雁南归。
兰有秀兮菊有芳，
怀佳人兮不能忘。

夜读偶得

更深人静一灯孤，
黄卷青灯伴老夫。
读到会心微笑处，
不知明月上庭梧。`;

// ============================================================
// 组件
// ============================================================
export default function XianyinPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 输入源
  const [text, setText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMode, setParseMode] = useState<"rule" | "ai">("ai");

  // 解析结果
  const [articles, setArticles] = useState<ParsedArticle[] | null>(null);

  // AI 写作
  const [writeMode, setWriteMode] = useState("generate");
  const [writeType, setWriteType] = useState("诗");
  const [styleHint, setStyleHint] = useState("");
  const [writeInput, setWriteInput] = useState("");
  const [writeResult, setWriteResult] = useState("");
  const [writeProvider, setWriteProvider] = useState("");
  const [writeLoading, setWriteLoading] = useState(false);

  // UI 状态
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"source" | "result" | "write">("source");

  // ========== 文件上传 ==========
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toastError("文件不能超过 5MB");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "txt" || ext === "md") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setText(ev.target?.result as string || "");
        setSourceLabel(`📄 ${file.name}`);
      };
      reader.readAsText(file);
    } else if (ext === "pdf") {
      setText(`[PDF 文件: ${file.name}]\n\n请将 PDF 内容复制粘贴到此处，或使用 AI 解析模式。`);
      setSourceLabel(`📕 ${file.name} (需手动粘贴内容)`);
      toastError("PDF 暂不支持自动提取，请手动复制内容后粘贴");
    } else if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") {
      setText(`[图片文件: ${file.name}]\n\n请将图片中的文字手动输入或使用 OCR 工具转换后粘贴。`);
      setSourceLabel(`🖼️ ${file.name} (需手动输入文字)`);
      toastError("图片暂不支持自动 OCR，请手动输入文字后粘贴");
    } else {
      toastError(`不支持的文件格式: .${ext}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [toastError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(fakeEvent);
  }, [handleFileUpload]);

  // ========== 智能解析 ==========
  const handleParse = useCallback(async () => {
    if (!text.trim()) return;
    setParsing(true);
    setArticles(null);

    try {
      const apiUrl = parseMode === "ai" ? "/api/admin/xianyin/ai-parse" : "/api/admin/xianyin/parse";
      const body = parseMode === "ai"
        ? { text: text.trim() }
        : { text: text.trim() };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles.map((a: ParsedArticle) => ({ ...a, selected: true })));
        success(`解析完成：${data.articles.length} 篇 (${data.strategy || parseMode})`);
      } else {
        const data = await res.json();
        toastError(data.error || "解析失败");
      }
    } catch {
      toastError("网络错误");
    } finally {
      setParsing(false);
    }
  }, [text, parseMode, success, toastError]);

  // ========== AI 写作 ==========
  const handleWrite = useCallback(async () => {
    if (!writeInput.trim()) return;
    setWriteLoading(true);
    setWriteResult("");
    try {
      const res = await fetch("/api/admin/xianyin/ai-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: writeMode, type: writeType, input: writeInput.trim(), styleHint: styleHint.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setWriteResult(data.output);
        setWriteProvider(`${data.provider} (${data.model})`);
      } else {
        const data = await res.json();
        toastError(data.error || "创作失败");
      }
    } catch { toastError("网络错误"); }
    finally { setWriteLoading(false); }
  }, [writeInput, writeMode, writeType, styleHint, toastError]);

  const useAsSource = (content: string) => {
    setText(content);
    setSourceLabel("💡 来自 AI 创作");
  };

  // ========== 文章操作 ==========
  const toggleSelect = (id: string) => {
    if (!articles) return;
    setArticles(articles.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };
  const toggleAll = () => {
    if (!articles) return;
    const allSel = articles.every(a => a.selected);
    setArticles(articles.map(a => ({ ...a, selected: !allSel })));
  };
  const removeArticle = (id: string) => {
    if (!articles) return;
    setArticles(articles.filter(a => a.id !== id));
  };
  const updateArticle = (id: string, field: string, value: string) => {
    if (!articles) return;
    setArticles(articles.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleImport = async () => {
    const selected = articles?.filter(a => a.selected);
    if (!selected?.length) { toastError("请至少选择一篇"); return; }
    setParsing(true);
    try {
      const res = await fetch("/api/admin/xianyin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles: selected.map(a => ({ title: a.title, body: a.body, type: a.type, subType: a.subType, preface: a.preface, postscript: a.postscript })) }),
      });
      if (res.ok) {
        const data = await res.json();
        success(`导入 ${data.count} 篇至樗栎集`);
        setArticles(null);
        router.push("/admin/chuli");
      } else {
        const data = await res.json();
        toastError(data.error || "导入失败");
      }
    } catch { toastError("网络错误"); }
    finally { setParsing(false); }
  };

  const selectedCount = articles?.filter(a => a.selected).length || 0;

  // ========== 三栏渲染 ==========
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      {/* 移动端 Tab 切换 */}
      <div className="md:hidden flex border-b border-paper-200 bg-white sticky top-0 z-10">
        {(["source", "result", "write"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${mobileTab === tab ? "text-accent border-b-2 border-accent" : "text-ink-400"}`}>
            {tab === "source" ? "📥 输入" : tab === "result" ? `📋 结果${articles ? `(${articles.length})` : ""}` : "✨ 写作"}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ===== 左栏: 输入源 ===== */}
        <div className={`${leftCollapsed ? "hidden" : "flex"} ${mobileTab !== "source" ? "hidden md:flex" : "flex"} md:w-[30%] lg:w-[28%] flex-col border-r border-paper-200 bg-paper-50`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-paper-200 bg-white">
            <h3 className="text-sm font-medium text-ink-700">输入源</h3>
            <button onClick={() => setLeftCollapsed(true)} className="md:hidden p-1 text-ink-400 hover:text-ink-600">
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* 文件上传区 */}
          <div className="p-3 border-b border-paper-100 bg-white">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-paper-300 rounded-lg p-4 text-center hover:border-accent/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} className="mx-auto text-ink-400 mb-1" />
              <p className="text-xs text-ink-500">拖拽文件或点击上传</p>
              <p className="text-[10px] text-ink-400 mt-0.5">.txt .md .pdf .jpg .png (≤5MB)</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} className="hidden" />
          </div>

          {/* 文本粘贴区 */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            {sourceLabel && <p className="text-xs text-ink-500 mb-2 truncate">{sourceLabel}</p>}
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setSourceLabel(""); }}
              placeholder={EXAMPLE}
              className="flex-1 w-full px-3 py-2 border border-paper-300 rounded-md bg-white text-sm font-serif resize-none focus:outline-none focus:border-accent"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleParse} disabled={parsing || !text.trim()}
                className="flex-1 py-2 bg-accent text-white rounded text-xs font-medium hover:bg-accent-dim transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {parsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {parseMode === "ai" ? "AI 解析" : "规则解析"}
              </button>
              <select value={parseMode} onChange={e => setParseMode(e.target.value as "rule" | "ai")}
                className="px-2 py-2 border border-paper-300 rounded text-xs bg-white">
                <option value="ai">AI</option>
                <option value="rule">规则</option>
              </select>
            </div>
          </div>
        </div>

        {/* ===== 中栏: 解析结果 ===== */}
        <div className={`${mobileTab !== "result" ? "hidden md:flex" : "flex"} md:w-[40%] lg:w-[44%] flex-col border-r border-paper-200 overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-paper-200 bg-white shrink-0">
            <div className="flex items-center gap-2">
              {leftCollapsed && (
                <button onClick={() => setLeftCollapsed(false)} className="hidden md:block p-1 text-ink-400 hover:text-ink-600">
                  <PanelLeftClose size={16} className="rotate-180" />
                </button>
              )}
              <h3 className="text-sm font-medium text-ink-700">
                解析结果 {articles ? `(${articles.length}篇)` : ""}
              </h3>
            </div>
            {articles && articles.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-ink-500 cursor-pointer">
                  <input type="checkbox" checked={articles.every(a => a.selected)} onChange={toggleAll} className="rounded" /> 全选
                </label>
                <span className="text-xs text-ink-400">{selectedCount}/{articles.length}</span>
                <button onClick={handleImport} disabled={parsing || selectedCount === 0}
                  className="px-3 py-1.5 bg-green text-white rounded text-xs font-medium hover:bg-green/80 transition-colors disabled:opacity-50">
                  导入 {selectedCount} 篇
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!articles && !parsing && (
              <div className="flex items-center justify-center h-full text-ink-400 text-sm">
                粘贴或上传文本后点击解析
              </div>
            )}
            {parsing && (
              <div className="flex items-center justify-center h-full text-ink-400">
                <Loader2 size={20} className="animate-spin mr-2" /> 解析中...
              </div>
            )}
            {articles?.map(article => (
              <div key={article.id} className={`bg-white rounded-lg border-2 transition-all ${article.selected ? "border-accent" : "border-paper-200 opacity-60"}`}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-paper-100">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={article.selected} onChange={() => toggleSelect(article.id)} className="rounded" />
                    <span className="text-xs px-1.5 py-0.5 bg-paper-100 rounded">{article.type}{article.subType ? `·${article.subType}` : ""}</span>
                    <span className={`text-[10px] ${article.confidence >= 0.9 ? "text-green" : article.confidence >= 0.7 ? "text-amber" : "text-ink-400"}`}>
                      {Math.round(article.confidence * 100)}%
                    </span>
                  </div>
                  <button onClick={() => removeArticle(article.id)} className="text-ink-400 hover:text-red"><Trash2 size={14} /></button>
                </div>
                <div className="p-3 space-y-2">
                  <input value={article.title} onChange={e => updateArticle(article.id, "title", e.target.value)}
                    className="w-full px-2 py-1 border border-paper-200 rounded text-sm font-medium focus:outline-none focus:border-accent" />
                  {article.preface && (
                    <textarea value={article.preface} onChange={e => updateArticle(article.id, "preface", e.target.value)}
                      className="w-full px-2 py-1 border border-blue-200 bg-blue-50/30 rounded text-xs font-serif resize-none focus:outline-none" rows={2} />
                  )}
                  <textarea value={article.body} onChange={e => updateArticle(article.id, "body", e.target.value)}
                    className="w-full px-2 py-1 border border-paper-200 rounded text-sm font-serif resize-none focus:outline-none focus:border-accent" rows={4} />
                  {article.postscript && (
                    <textarea value={article.postscript} onChange={e => updateArticle(article.id, "postscript", e.target.value)}
                      className="w-full px-2 py-1 border border-amber-200 bg-amber-50/30 rounded text-xs font-serif resize-none focus:outline-none" rows={2} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 右栏: AI 写作助手 ===== */}
        <div className={`${rightCollapsed ? "hidden" : "flex"} ${mobileTab !== "write" ? "hidden md:flex" : "flex"} md:w-[30%] lg:w-[28%] flex-col border-r-0 bg-paper-50`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-paper-200 bg-white">
            <h3 className="text-sm font-medium text-ink-700 flex items-center gap-1"><Sparkles size={14} className="text-accent" /> AI 助手</h3>
            <button onClick={() => setRightCollapsed(true)} className="md:hidden p-1 text-ink-400"><PanelRightClose size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 模式选择 */}
            <div>
              <label className="text-xs text-ink-500 block mb-1">模式</label>
              <select value={writeMode} onChange={e => setWriteMode(e.target.value)}
                className="w-full px-2 py-1.5 border border-paper-300 rounded text-xs">
                {WRITE_MODES.map(m => <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-ink-500 block mb-1">体裁</label>
                <select value={writeType} onChange={e => setWriteType(e.target.value)}
                  className="w-full px-2 py-1.5 border border-paper-300 rounded text-xs">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-ink-500 block mb-1">风格(可选)</label>
                <input value={styleHint} onChange={e => setStyleHint(e.target.value)}
                  className="w-full px-2 py-1.5 border border-paper-300 rounded text-xs" placeholder="豪放/婉约…" />
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-500 block mb-1">{writeMode === "generate" ? "想法/主题" : "输入内容"}</label>
              <textarea value={writeInput} onChange={e => setWriteInput(e.target.value)}
                className="w-full px-2 py-1.5 border border-paper-300 rounded text-sm font-serif resize-none focus:outline-none focus:border-accent"
                rows={4} placeholder={writeMode === "generate" ? "如：写一首关于秋夜思乡的七律" : "粘贴需要处理的诗文…"} />
            </div>

            <button onClick={handleWrite} disabled={writeLoading || !writeInput.trim()}
              className="w-full py-2 bg-accent text-white rounded text-xs font-medium hover:bg-accent-dim transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
              {writeLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {writeLoading ? "创作中…" : WRITE_MODES.find(m => m.value === writeMode)?.label}
            </button>

            {/* 输出区 */}
            {writeResult && (
              <div className="p-3 bg-white rounded-lg border-2 border-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-ink-400">{writeProvider}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { navigator.clipboard.writeText(writeResult); success("已复制"); }}
                      className="text-xs text-ink-400 hover:text-accent flex items-center gap-0.5"><Copy size={12} /> 复制</button>
                    <button onClick={() => useAsSource(writeResult)}
                      className="text-xs text-ink-400 hover:text-accent flex items-center gap-0.5"><ExternalLink size={12} /> 设为源</button>
                  </div>
                </div>
                <div className="text-sm font-serif text-ink-800 leading-relaxed whitespace-pre-wrap">{writeResult}</div>
              </div>
            )}

            {/* 提示 */}
            <div className="p-2 bg-paper-100 rounded text-[10px] text-ink-400 leading-relaxed">
              💡 提示：<br />
              · 左侧粘贴或上传文本<br />
              · 点击「AI 解析」自动分篇<br />
              · 右侧可随时进行 AI 创作<br />
              · 创作结果可「设为源」再分篇
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
