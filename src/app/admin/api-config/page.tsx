"use client";


import { useState, useEffect, useCallback } from "react";
import { Wifi, Pencil, Check, X, Activity } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";

interface Provider {
  id: string;
  name: string;
  label: string;
  baseUrl: string;
  model: string;
  priority: number;
  enabled: boolean;
  hasApiKey: boolean;
}

interface EditingProvider extends Provider {
  apiKeyDraft: string;
  clearStoredKey: boolean;
}

interface AiTaskStat {
  taskName: string;
  total: number;
  success: number;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: string | null;
  lastError: string | null;
}

export default function AdminApiConfigPage() {
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number; checkedAt: string }>>({});
  const [editing, setEditing] = useState<EditingProvider | null>(null);
  const [taskStats, setTaskStats] = useState<AiTaskStat[]>([]);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const [providerRes, taskRes] = await Promise.all([
        fetch("/api/admin/providers"),
        fetch("/api/admin/ai-tasks/stats"),
      ]);
      const providerData = await providerRes.json();
      const taskData = await taskRes.json();
      setProviders(providerData);
      setTaskStats(taskData.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  async function handleToggle(provider: Provider) {
    const action = provider.enabled ? "停用" : "启用";
    confirm({
      title: `${action} Provider`,
      description: `确定要${action}「${provider.label}」吗？`,
      variant: provider.enabled ? "warning" : "default",
      onConfirm: async () => {
        const updated = { ...provider, enabled: !provider.enabled };
        try {
          const res = await fetch("/api/admin/providers", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: provider.id, enabled: updated.enabled }),
          });
          if (res.ok) {
            setProviders((prev) => prev.map((p) => (p.id === provider.id ? updated : p)));
            success(`已${action}「${provider.label}」`);
          } else {
            toastError(`${action}失败`);
          }
        } catch {
          toastError(`${action}失败`);
        }
      },
    });
  }

  async function handleTest(provider: Provider) {
    setTesting(provider.id);
    try {
      const res = await fetch("/api/admin/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: provider.id }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [provider.id]: data }));
      if (data.success) {
        success(`${data.message}${data.latencyMs ? ` · ${data.latencyMs}ms` : ""}`);
        setProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, enabled: true } : p)));
      } else {
        toastError(data.message || "连接失败");
      }
    } catch {
      toastError("连接失败");
    } finally {
      setTesting(null);
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const { apiKeyDraft, clearStoredKey, hasApiKey: _hasApiKey, ...providerData } = editing;
    const apiKeyUpdate = clearStoredKey
      ? { apiKey: null }
      : apiKeyDraft.trim()
        ? { apiKey: apiKeyDraft.trim() }
        : {};

    try {
      const res = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...providerData, ...apiKeyUpdate }),
      });
      if (res.ok) {
        const saved = await res.json();
        setProviders((prev) => prev.map((p) => {
          if (p.id === saved.id) return saved;
          if (editing.name.startsWith("deepseek") && p.name.startsWith("deepseek") && (clearStoredKey || apiKeyDraft.trim())) {
            return { ...p, hasApiKey: !clearStoredKey };
          }
          return p;
        }));
        setEditing(null);
        success("配置已保存");
      } else {
        toastError("保存失败");
      }
    } catch {
      toastError("保存失败");
    }
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-serif text-ink-900 mb-8">API 配置</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-paper-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-serif text-ink-900 mb-2">API 配置</h2>
      <p className="text-sm text-ink-500 mb-6">
        LLM Provider 配置管理。Key 优先级：数据库配置 → 环境变量。全部不可用时自动跳过。
      </p>

      <div className="bg-paper-50 border border-paper-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-accent" />
          <h3 className="text-sm font-medium text-ink-900">AI 任务面板（近 7 天）</h3>
        </div>
        {taskStats.length === 0 ? (
          <p className="text-xs text-ink-400">暂无 AI 任务记录。执行一次 AI 生成、校审或配图后会显示统计。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {taskStats.map((task) => (
              <div key={task.taskName} className="bg-white border border-paper-200 rounded-md p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-800">{task.taskName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${task.successRate >= 80 ? "bg-green/10 text-green" : "bg-amber/10 text-amber-700"}`}>
                    {task.successRate}%
                  </span>
                </div>
                <p className="text-xs text-ink-400 mt-1">
                  {task.success}/{task.total} 成功 · 平均 {task.avgDurationMs}ms
                </p>
                {task.lastRunAt && (
                  <p className="text-xs text-ink-300 mt-1">最近：{new Date(task.lastRunAt).toLocaleString("zh-CN")}</p>
                )}
                {task.lastError && (
                  <p className="text-xs text-red mt-1 line-clamp-2">错误：{task.lastError}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {providers.map((p) => (
          <div
            key={p.id}
            className="bg-paper-50 border border-paper-200 rounded-lg hover:shadow-md transition-all"
          >
            {editing?.id === p.id ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-ink-400">API Key</label>
                  <input
                    type="password"
                    value={editing.apiKeyDraft}
                    disabled={editing.clearStoredKey}
                    onChange={(e) => setEditing({ ...editing, apiKeyDraft: e.target.value })}
                    placeholder={editing.hasApiKey ? "已配置；输入新 Key 可替换" : "留空则使用环境变量中的 Key"}
                    className="w-full px-2 py-1.5 border border-paper-300 rounded text-sm focus:outline-none focus:border-ink-300"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-ink-300">数据库存储的 Key 优先级高于环境变量；DeepSeek V4 两个模型共享保存的 Key</p>
                    {editing.hasApiKey && (
                      <label className="flex items-center gap-1 text-xs text-ink-400">
                        <input
                          type="checkbox"
                          checked={editing.clearStoredKey}
                          onChange={(e) => setEditing({ ...editing, clearStoredKey: e.target.checked, apiKeyDraft: "" })}
                        />
                        清除已存 Key
                      </label>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-ink-400">Base URL</label>
                    <input
                      type="text"
                      value={editing.baseUrl}
                      onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
                      className="w-full px-2 py-1.5 border border-paper-300 rounded text-sm focus:outline-none focus:border-ink-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-400">模型</label>
                    <input
                      type="text"
                      value={editing.model}
                      onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                      className="w-full px-2 py-1.5 border border-paper-300 rounded text-sm focus:outline-none focus:border-ink-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-400">优先级</label>
                    <input
                      type="number"
                      value={editing.priority}
                      onChange={(e) => setEditing({ ...editing, priority: +e.target.value })}
                      className="w-full px-2 py-1.5 border border-paper-300 rounded text-sm focus:outline-none focus:border-ink-300"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs border border-paper-300 rounded text-ink-500 hover:bg-paper-200 transition-colors flex items-center gap-1">
                    <X size={12} /> 取消
                  </button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-dim transition-colors flex items-center gap-1">
                    <Check size={12} /> 保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{p.label}</span>
                    <button
                      onClick={() => handleToggle(p)}
                      className={`w-2 h-2 rounded-full transition-colors ${p.enabled ? "bg-green" : "bg-ink-300"}`}
                      title={p.enabled ? "已启用，点击停用" : "已停用，点击启用"}
                    />
                    <span className="text-xs text-ink-400">{p.enabled ? "已启用" : "已停用"}</span>
                  </div>
                  <p className="text-xs text-ink-400 mt-1">{p.model} · {p.baseUrl} · 优先级 {p.priority} {p.hasApiKey ? "· Key 已配置" : "· 未配置 Key"}</p>
                  {testResults[p.id] && (
                    <p className={`text-xs mt-1 ${testResults[p.id].success ? "text-green" : "text-red"}`}>
                      最近测试：{testResults[p.id].message}
                      {testResults[p.id].latencyMs ? ` · ${testResults[p.id].latencyMs}ms` : ""}
                      {" · "}
                      {new Date(testResults[p.id].checkedAt).toLocaleString("zh-CN")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing({ ...p, apiKeyDraft: "", clearStoredKey: false })}
                    className="px-3 py-1.5 text-xs border border-paper-300 rounded-md text-ink-500 hover:bg-paper-200 transition-colors flex items-center gap-1"
                  >
                    <Pencil size={12} /> 配置
                  </button>
                  <button
                    onClick={() => handleTest(p)}
                    disabled={testing === p.id}
                    className="px-3 py-1.5 text-xs border border-paper-300 rounded-md text-ink-500 hover:bg-accent-bg hover:text-accent transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Wifi size={12} />
                    {testing === p.id ? "测试中..." : "测试"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
