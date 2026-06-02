"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";

interface PinyinEntry {
  id: string;
  phrase: string;
  pinyin: string;
  category: string;
  source: string | null;
  verified: boolean;
  aiLogId: string | null;
  createdAt: string;
}

const CATEGORIES = ["全部", "通假字", "古地名", "人名", "多音字", "官名", "姓氏", "典故", "复姓", "异读", "专名", "制度"];

export default function PinyinDictPage() {
  const [items, setItems] = useState<PinyinEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [showUnverified, setShowUnverified] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 添加/编辑表单
  const [formPhrase, setFormPhrase] = useState("");
  const [formPinyin, setFormPinyin] = useState("");
  const [formCategory, setFormCategory] = useState("通假字");
  const [formSource, setFormSource] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (showUnverified) params.set("verified", "false");
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(`/api/admin/pinyin-dict?${params}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, showUnverified, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const batchVerify = async () => {
    if (selected.size === 0) return;
    await fetch("/api/admin/pinyin-dict", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], verified: true }),
    });
    setSelected(new Set());
    fetchData();
  };

  const toggleVerified = async (id: string, current: boolean) => {
    await fetch("/api/admin/pinyin-dict", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], verified: !current }),
    });
    fetchData();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("确认删除？")) return;
    await fetch(`/api/admin/pinyin-dict?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhrase.trim() || !formPinyin.trim()) return;
    await fetch("/api/admin/pinyin-dict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase: formPhrase, pinyin: formPinyin, category: formCategory, source: formSource || null }),
    });
    setFormPhrase(""); setFormPinyin(""); setFormSource("");
    fetchData();
  };

  const startEdit = (item: PinyinEntry) => {
    setEditingId(item.id);
    setFormPhrase(item.phrase);
    setFormPinyin(item.pinyin);
    setFormCategory(item.category);
    setFormSource(item.source || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormPhrase(""); setFormPinyin(""); setFormSource("");
  };

  return (
    <div className="admin-content max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink-900">读音审校</h1>
          <p className="text-sm text-ink-500 mt-1">
            管理通假字、古地名、人名等异读词典 ({total} 条)
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={batchVerify} className="px-4 py-2 bg-accent text-white rounded text-sm font-medium">
              批量确认 ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* 添加/编辑 */}
      <form onSubmit={submitForm} className="bg-paper-50 border border-paper-200 rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-ink-500 mb-1">词组</label>
          <input value={formPhrase} onChange={e => setFormPhrase(e.target.value)}
            className="px-3 py-1.5 border border-paper-200 rounded text-sm w-32" placeholder="会稽" />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">拼音</label>
          <input value={formPinyin} onChange={e => setFormPinyin(e.target.value)}
            className="px-3 py-1.5 border border-paper-200 rounded text-sm w-40" placeholder="kuài jī" />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">分类</label>
          <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
            className="px-3 py-1.5 border border-paper-200 rounded text-sm">
            {CATEGORIES.filter(c => c !== "全部").map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">出处</label>
          <input value={formSource} onChange={e => setFormSource(e.target.value)}
            className="px-3 py-1.5 border border-paper-200 rounded text-sm w-36" placeholder="《滕王阁序》" />
        </div>
        <button type="submit" className="px-4 py-1.5 bg-ink-900 text-white rounded text-sm font-medium">
          {editingId ? "更新" : "添加"}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit} className="px-3 py-1.5 border border-paper-200 rounded text-sm text-ink-500">
            取消
          </button>
        )}
      </form>

      {/* 筛选 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-paper-200 rounded text-sm">
          {CATEGORIES.map(c => <option key={c} value={c === "全部" ? "" : c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink-600">
          <input type="checkbox" checked={showUnverified} onChange={e => { setShowUnverified(e.target.checked); setPage(1); }} />
          仅待确认
        </label>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-paper-200 rounded text-sm w-48" placeholder="搜索词组..." />
      </div>

      {/* 表格 */}
      <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-50 text-left text-ink-500">
            <tr>
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={selected.size === items.length && items.length > 0}
                  onChange={toggleAll} />
              </th>
              <th className="px-3 py-2">词组</th>
              <th className="px-3 py-2">拼音</th>
              <th className="px-3 py-2">分类</th>
              <th className="px-3 py-2">出处</th>
              <th className="px-3 py-2 w-20">状态</th>
              <th className="px-3 py-2 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-400">暂无数据</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-t border-paper-100 hover:bg-paper-50/50">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                </td>
                <td className="px-3 py-2 font-medium">{item.phrase}</td>
                <td className="px-3 py-2 text-ink-500 font-mono text-xs">{item.pinyin}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 bg-paper-100 rounded text-xs">{item.category}</span>
                </td>
                <td className="px-3 py-2 text-ink-400 text-xs max-w-32 truncate">{item.source || "-"}</td>
                <td className="px-3 py-2">
                  {item.verified
                    ? <span className="text-green text-xs">✓ 已确认</span>
                    : <span className="text-amber text-xs">待审校</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => toggleVerified(item.id, item.verified)}
                      className="px-2 py-0.5 text-xs border rounded hover:bg-paper-100">
                      {item.verified ? "取消" : "确认"}
                    </button>
                    <button onClick={() => startEdit(item)}
                      className="px-2 py-0.5 text-xs border rounded hover:bg-paper-100">编辑</button>
                    <button onClick={() => deleteEntry(item.id)}
                      className="px-2 py-0.5 text-xs border rounded hover:bg-red-50 text-red">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > 50 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-ink-500">共 {total} 条</span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, Math.ceil(total / 50)) }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded border ${page === i + 1 ? "bg-accent text-white border-accent" : "border-paper-200 hover:bg-paper-50"}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
