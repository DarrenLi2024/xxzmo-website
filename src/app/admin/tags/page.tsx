"use client";


import { useState, useEffect, useCallback } from "react";
import { Trash2, Plus, Search, Pencil, Check, X, GitMerge } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { fetchJson } from "@/lib/fetch-json";

interface Tag {
  id: string;
  name: string;
  category: string;
  count: number;
  _count: { articles: number };
}

export default function AdminTagsPage() {
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      const data = await fetchJson<Tag[]>("/api/tags");
      setTags(data);
    } catch (error) {
      console.error("[AdminTagsPage] 获取标签失败:", error);
      toastError("标签加载失败");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await fetchJson("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      fetchTags();
      success(`标签「${newName.trim()}」已创建`);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "网络错误，请重试");
    }
  }

  function startRename(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
  }

  function cancelRename() {
    setEditingId(null);
    setEditName("");
  }

  async function handleRename(tag: Tag) {
    if (!editName.trim() || editName.trim() === tag.name) {
      cancelRename();
      return;
    }
    try {
      await fetchJson(`/api/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tag.id, name: editName.trim() }),
      });
      success(`标签已重命名为「${editName.trim()}」`);
      fetchTags();
    } catch (error) {
      toastError(error instanceof Error ? error.message : "网络错误，请重试");
    }
    cancelRename();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)
    );
  }

  function handleStartMerge() {
    if (selectedIds.length !== 2) return;
    const [keepId, removeId] = selectedIds;
    const keepTag = tags.find((t) => t.id === keepId);
    const removeTag = tags.find((t) => t.id === removeId);
    if (!keepTag || !removeTag) return;

    confirm({
      title: "合并标签",
      description: `将「${removeTag.name}」( ${removeTag._count?.articles ?? removeTag.count} 篇 ) 合并入「${keepTag.name}」( ${keepTag._count?.articles ?? keepTag.count} 篇 )，合并后「${removeTag.name}」将被删除。`,
      variant: "warning",
      onConfirm: async () => {
        setMerging(true);
        try {
          await fetchJson("/api/tags/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keepId, removeId }),
          });
          success(`已合并至「${keepTag.name}」`);
          setSelectedIds([]);
          fetchTags();
        } catch (error) {
          toastError(error instanceof Error ? error.message : "网络错误，请重试");
        } finally {
          setMerging(false);
        }
      },
    });
  }

  async function handleDelete(tag: Tag) {
    confirm({
      title: "删除标签",
      description: `确定要删除「${tag.name}」吗？该标签将从所有文章中移除。`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await fetchJson(`/api/tags?id=${tag.id}`, { method: "DELETE" });
          success(`标签「${tag.name}」已删除`);
          setSelectedIds((prev) => prev.filter((id) => id !== tag.id));
          fetchTags();
        } catch (error) {
          toastError(error instanceof Error ? error.message : "网络错误，请重试");
        }
      },
    });
  }

  const filteredTags = tags.filter((t) => {
    const matchSearch = !search.trim() || t.name.includes(search.trim());
    const matchCategory = categoryFilter === "全部" || t.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-serif text-ink-900 mb-8">标签管理</h2>
        <div className="flex gap-2 animate-pulse">
          {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-20 bg-paper-200 rounded-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-serif text-ink-900 mb-8">标签管理</h2>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 flex-wrap">
          {["全部","体裁","主题"].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                categoryFilter === cat
                  ? "bg-ink-700 text-white"
                  : "bg-paper-100 text-ink-500 hover:bg-paper-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标签..."
            className="pl-8 pr-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300 w-44"
          />
        </div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="新标签名称"
          className="px-3 py-2 border border-paper-300 rounded-md text-sm focus:outline-none focus:border-ink-300 w-40"
        />
        <button onClick={handleCreate} className="inline-flex items-center gap-1 px-3 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors">
          <Plus size={14} /> 添加
        </button>
        {selectedIds.length === 2 && (
          <button onClick={handleStartMerge} disabled={merging} className="inline-flex items-center gap-1 px-3 py-2 border border-amber/30 text-amber bg-amber/5 rounded-md text-sm hover:bg-amber/10 transition-colors">
            <GitMerge size={14} /> 合并选中
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-xs text-ink-400 mb-3">
          已选择 {selectedIds.length}/2 个标签（选满 2 个后可合并）
        </p>
      )}

      {filteredTags.length === 0 ? (
        <p className="text-ink-300 text-sm">{search ? "无匹配标签" : "暂无标签"}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filteredTags.map((tag) =>
            editingId === tag.id ? (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-paper-50 border border-accent/30 rounded-full"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(tag);
                    if (e.key === "Escape") cancelRename();
                  }}
                  autoFocus
                  className="w-20 px-1 py-0 text-sm border-none outline-none bg-transparent text-ink-900"
                />
                <button onClick={() => handleRename(tag)} className="text-green hover:text-green/70">
                  <Check size={12} />
                </button>
                <button onClick={cancelRename} className="text-ink-300 hover:text-ink-700">
                  <X size={12} />
                </button>
              </span>
            ) : (
              <span
                key={tag.id}
                onClick={() => toggleSelect(tag.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm transition-all cursor-pointer ${
                  selectedIds.includes(tag.id)
                    ? "border-accent bg-accent/5 text-accent"
                    : "bg-paper-100 border-paper-200 text-ink-700 hover:border-paper-300"
                }`}
              >
                <span className={`text-xs px-1.5 py-0.5 rounded ${tag.category === "体裁" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{tag.category}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(tag);
                  }}
                  className="cursor-text hover:text-accent"
                  title="双击重命名"
                >
                  {tag.name}
                </span>
                <span className="text-xs text-ink-400">({tag._count?.articles ?? tag.count})</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(tag);
                  }}
                  className="text-ink-300 hover:text-red transition-colors"
                  title="删除标签"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
