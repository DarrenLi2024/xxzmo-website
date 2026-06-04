"use client";


import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { fetchJson } from "@/lib/fetch-json";

interface Painting {
  id: string;
  title: string;
  artist: string | null;
  dynasty: string | null;
  tags: string[];
  url: string;
}

export default function AdminPaintingsPage() {
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPaintings = useCallback(async () => {
    try {
      const data = await fetchJson<Painting[]>("/api/paintings");
      setPaintings(data);
    } catch (error) {
      console.error("[AdminPaintingsPage] 获取配图失败:", error);
      toastError("配图加载失败");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchPaintings(); }, [fetchPaintings]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await fetchJson("/api/paintings", {
        method: "POST",
        body: formData,
      });

      success("配图上传成功");
      fetchPaintings();
    } catch (error) {
      toastError(error instanceof Error ? error.message : "网络错误，请重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDelete(painting: Painting) {
    confirm({
      title: "删除配图",
      description: `确定要删除「${painting.title}」吗？此操作不可撤销。`,
      variant: "danger",
      onConfirm: async () => {
        setDeleting(painting.id);
        try {
          await fetchJson(`/api/paintings?id=${painting.id}`, { method: "DELETE" });
          success("配图已删除");
          fetchPaintings();
        } catch (error) {
          toastError(error instanceof Error ? error.message : "网络错误，请重试");
        } finally {
          setDeleting(null);
        }
      },
    });
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-serif text-ink-900 mb-8">配图库</h2>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="aspect-[17/7] bg-paper-200 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif text-ink-900">配图库管理</h2>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="hidden"
            id="painting-upload"
          />
          <label
            htmlFor="painting-upload"
            className={`inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploading ? (
              <><Loader2 size={14} className="animate-spin" /> 上传中...</>
            ) : (
              <><Upload size={14} /> 上传配图</>
            )}
          </label>
        </div>
      </div>

      {paintings.length === 0 ? (
        <p className="text-ink-300 text-sm">暂无配图</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {paintings.map((p) => (
            <div key={p.id} className="relative bg-paper-50 border border-paper-200 rounded-lg p-4 hover:shadow-md transition-all group">
              <div className="aspect-[17/7] bg-gradient-to-br from-paper-100 to-paper-200 rounded mb-3 overflow-hidden relative">
                <Image
                  src={p.url}
                  alt={p.title}
                  fill
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='112' viewBox='0 0 200 112'%3E%3Crect fill='%23e5e7eb' width='200' height='112'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='10' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(p.title || '古画')}%3C/text%3E%3C/svg%3E`
                  }}
                />
              </div>
              <h3 className="text-sm font-medium text-ink-900">{p.title}</h3>
              <p className="text-xs text-ink-500 mt-0.5">
                {[p.artist, p.dynasty].filter(Boolean).join(" · ") || "佚名"}
              </p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {p.tags.map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 bg-paper-200 rounded-full text-ink-500">{t}</span>
                ))}
              </div>
              <button
                onClick={() => handleDelete(p)}
                disabled={deleting === p.id}
                className="absolute top-3 right-3 p-1.5 rounded-md text-ink-300 hover:text-red hover:bg-red/5 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                title="删除配图"
              >
                {deleting === p.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
