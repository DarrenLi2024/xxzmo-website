"use client";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check } from "lucide-react";

export default function AdminJiguTaiBatchPage() {
  const router = useRouter();
  const [titles, setTitles] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [needSource, setNeedSource] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function handleBatchGenerate() {
    const titleList = titles
      .split(/[\n,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (titleList.length === 0) {
      setError("请输入至少一个标题");
      return;
    }

    setGenerating(true);
    setError("");
    setResults([]);
    setNeedSource([]);
    setFailed([]);

    const done: string[] = [];
    const pending: string[] = [];
    const failedItems: string[] = [];

    for (const title of titleList) {
      try {
        const res = await fetch("/api/admin/jigu-tai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.needSource) {
            pending.push(title);
            setNeedSource([...pending]);
          } else {
            done.push(title);
            setResults([...done]);
          }
        } else {
          failedItems.push(title);
          setFailed([...failedItems]);
        }
      } catch {
        failedItems.push(title);
        setFailed([...failedItems]);
      }
    }

    setGenerating(false);
    setTitles("");
  }

  return (
    <div>
      <h2 className="text-2xl font-serif text-ink-900 mb-8">批量导入</h2>

      <div className="bg-paper-50 border border-paper-200 rounded-lg p-6">
        <label className="block text-sm text-ink-700 mb-2">
          输入多个经典篇目标题（每行一个，或用逗号分隔）
        </label>
        <textarea
          value={titles}
          onChange={(e) => setTitles(e.target.value)}
          placeholder={"滕王阁序\n蜀道难\n岳阳楼记"}
          rows={8}
          disabled={generating}
          className="w-full px-4 py-3 rounded-md border border-paper-300 bg-white text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 transition-all mb-4 disabled:opacity-50 font-serif"
        />

        {error && <p className="text-sm text-red mb-3">{error}</p>}

        <button
          onClick={handleBatchGenerate}
          disabled={generating || !titles.trim()}
          className="px-6 py-3 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" /> 批量检索中...
            </>
          ) : (
            <>
              <Sparkles size={16} /> 批量检索来源
            </>
          )}
        </button>

        {results.length > 0 && (
          <div className="mt-4 p-4 bg-green/5 border border-green/20 rounded-md">
            <p className="text-sm text-ink-700 mb-2 flex items-center gap-1">
              <Check size={14} className="text-green" />
              已完成 {results.length} 篇：
            </p>
            <ul className="text-sm text-ink-500 space-y-1">
              {results.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
        )}

        {needSource.length > 0 && (
          <div className="mt-4 p-4 bg-amber/5 border border-amber/20 rounded-md">
            <p className="text-sm text-ink-700 mb-2">需人工确认来源 {needSource.length} 篇：</p>
            <ul className="text-sm text-ink-500 space-y-1">
              {needSource.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
        )}

        {failed.length > 0 && (
          <div className="mt-4 p-4 bg-red/5 border border-red/20 rounded-md">
            <p className="text-sm text-red mb-2">失败 {failed.length} 篇：</p>
            <ul className="text-sm text-ink-500 space-y-1">
              {failed.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.push("/admin/jigu")}
          className="px-4 py-2 border border-paper-300 text-ink-700 rounded-md text-sm hover:bg-paper-200 transition-colors"
        >
          查看辑古录管理
        </button>
      </div>
    </div>
  );
}
