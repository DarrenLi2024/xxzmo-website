"use client";


import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function init() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/init-providers", { method: "POST" });
      const data = await res.json();
      setResult(res.ok ? JSON.stringify(data, null, 2) : `错误: ${data.error}`);
    } catch (e: unknown) {
      setResult(`请求失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper-50 flex items-center justify-center">
      <div className="bg-white border border-paper-200 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-serif text-ink-900 mb-4">初始化 LLM Providers</h1>
        <p className="text-sm text-ink-500 mb-6">点击下方按钮，为数据库初始化 6 个 LLM Provider 配置。</p>
        <button
          onClick={init}
          disabled={loading}
          className="w-full px-4 py-2 bg-accent text-white rounded hover:bg-accent-dim transition-colors disabled:opacity-50"
        >
          {loading ? "初始化中..." : "初始化 Providers"}
        </button>
        {result && (
          <pre className="mt-4 p-3 bg-paper-100 rounded text-xs text-ink-700 overflow-auto">{result}</pre>
        )}
        {result && !result.startsWith("错误") && (
          <button
            onClick={() => router.push("/admin/api-config")}
            className="mt-4 w-full px-4 py-2 border border-paper-300 rounded text-ink-600 hover:bg-paper-100 transition-colors"
          >
            返回 API 配置
          </button>
        )}
      </div>
    </div>
  );
}