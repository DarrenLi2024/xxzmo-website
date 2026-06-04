"use client";


import { useState, useEffect } from "react";
import { useToast } from "@/components/admin/Toast";
import { fetchJson } from "@/lib/fetch-json";

export default function AdminSettingsPage() {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    siteName: "闲心子墨",
    authorName: "狂野君",
    authorTitle: "山房主人",
    bio: "性喜山林，偶作诗文",
    signature: "樗栎本无用，天地一散人",
    seoDesc: "",
    homeChuliCount: 10,
    showStats: true,
    quoteSource: "collection_first",
    quoteAiStyle: "山林隐逸，洒脱不羁，偶见悲怆",
    importSeparator: "---",
  });

  useEffect(() => {
    fetchJson<Record<string, unknown> | null>("/api/site-config")
      .then((data) => {
        if (data) setForm((prev) => ({ ...prev, ...data }));
      })
      .catch((error) => {
        console.error("[AdminSettingsPage] 获取配置失败:", error);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetchJson("/api/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      success("设置已保存");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif text-ink-900">系统设置</h2>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors disabled:opacity-50">
          {saving ? "保存中..." : "保存设置"}
        </button>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* 基本信息 */}
        <div className="bg-white border border-paper-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-ink-700 mb-4">基本信息</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-ink-500 mb-1">站点名称</label>
                <input type="text" value={form.siteName} onChange={(e) => setForm({...form, siteName: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
              </div>
              <div>
                <label className="block text-sm text-ink-500 mb-1">SEO 描述</label>
                <input type="text" value={form.seoDesc} onChange={(e) => setForm({...form, seoDesc: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-ink-500 mb-1">作者名</label>
                <input type="text" value={form.authorName} onChange={(e) => setForm({...form, authorName: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
              </div>
              <div>
                <label className="block text-sm text-ink-500 mb-1">斋号</label>
                <input type="text" value={form.authorTitle} onChange={(e) => setForm({...form, authorTitle: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
              </div>
              <div>
                <label className="block text-sm text-ink-500 mb-1">首页每页篇数</label>
                <input type="number" value={form.homeChuliCount} onChange={(e) => setForm({...form, homeChuliCount: +e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
              </div>
            </div>
          </div>
        </div>

        {/* 作者信息 */}
        <div className="bg-white border border-paper-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-ink-700 mb-4">作者信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-ink-500 mb-1">签名</label>
              <input type="text" value={form.signature} onChange={(e) => setForm({...form, signature: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">简介</label>
              <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} rows={2} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
            </div>
          </div>
        </div>

        {/* 内容配置 */}
        <div className="bg-white border border-paper-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-ink-700 mb-4">内容配置</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-ink-500 mb-1">名句来源策略</label>
                <select value={form.quoteSource} onChange={(e) => setForm({...form, quoteSource: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300">
                  <option value="collection_only">仅樗栎集</option>
                  <option value="collection_first">樗栎集优先</option>
                  <option value="ai_only">仅 AI 生成</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-ink-500 mb-1">导入分隔符</label>
                <input type="text" value={form.importSeparator} onChange={(e) => setForm({...form, importSeparator: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-ink-500 mb-1">AI 名句风格</label>
              <input type="text" value={form.quoteAiStyle} onChange={(e) => setForm({...form, quoteAiStyle: e.target.value})} className="w-full px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
