"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, PenLine, Sparkles, Volume2, FileText, Loader2 } from "lucide-react";

interface DashboardData {
  totalPublished: number;
  chuliCount: number;
  jiguCount: number;
  draftCount: number;
  reviewCount: number;
  tagCount: number;
  withPinyin: number;
  withAnnotations: number;
  withPainting: number;
  recentActions: { action: string; summary: string; time: string }[];
  typeDistribution: { type: string; count: number }[];
  monthlyTrends: { month: string; count: number }[];
}

const TYPE_COLORS: Record<string, string> = {
  "诗": "bg-amber-100 text-amber-700", "词": "bg-emerald-100 text-emerald-700",
  "曲": "bg-purple-100 text-purple-700", "赋": "bg-orange-100 text-orange-700",
  "文": "bg-sky-100 text-sky-700", "联": "bg-rose-100 text-rose-700",
  "新诗": "bg-teal-100 text-teal-700", "打油诗": "bg-yellow-100 text-yellow-700",
  "随笔": "bg-gray-100 text-gray-700", "日记": "bg-slate-100 text-slate-700",
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="admin-content flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-ink-400" size={24} />
    </div>
  );

  if (!data) return <div className="admin-content py-12 text-center text-ink-400">加载失败</div>;

  const statCards = [
    { icon: BookOpen, label: "已发布", value: data.totalPublished, href: "/admin/chuli", color: "text-ink-900" },
    { icon: PenLine, label: "樗栎集", value: data.chuliCount, href: "/admin/chuli", color: "text-accent" },
    { icon: Sparkles, label: "辑古录", value: data.jiguCount, href: "/admin/jigu", color: "text-amber" },
    { icon: FileText, label: "待处理", value: data.draftCount + data.reviewCount, href: "/admin/chuli", color: "text-sky-600" },
  ];

  return (
    <div className="admin-content max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-ink-900">馆藏总览</h1>
        <p className="text-sm text-ink-400 mt-1">
          {new Date().toLocaleDateString("zh-CN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white border border-paper-200 rounded-2xl p-5 hover:shadow-md hover:border-paper-300 transition-all duration-200 group"
          >
            <card.icon size={20} className={card.color + " mb-3 opacity-70 group-hover:opacity-100 transition-opacity"} />
            <p className="text-3xl font-bold text-ink-900 tracking-tight">{card.value}</p>
            <p className="text-xs text-ink-400 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 数据完整度 */}
        <div className="bg-white border border-paper-200 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-ink-600 mb-4">数据完整度</h3>
          <div className="space-y-3">
            {[
              { label: "含拼音", value: data.withPinyin, total: data.totalPublished },
              { label: "含注释", value: data.withAnnotations, total: data.totalPublished },
              { label: "有配图", value: data.withPainting, total: data.totalPublished },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-ink-500 mb-1">
                  <span>{item.label}</span>
                  <span>{Math.round((item.value / item.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-paper-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/60 rounded-full transition-all"
                    style={{ width: `${(item.value / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 体裁分布 */}
        <div className="bg-white border border-paper-200 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-ink-600 mb-4">体裁分布</h3>
          <div className="flex flex-wrap gap-1.5">
            {data.typeDistribution.slice(0, 12).map(t => (
              <span
                key={t.type}
                className={`px-2 py-0.5 rounded-full text-xs ${TYPE_COLORS[t.type] || "bg-gray-100 text-gray-600"}`}
              >
                {t.type} {t.count}
              </span>
            ))}
          </div>
        </div>

        {/* 最近动态 */}
        <div className="bg-white border border-paper-200 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-ink-600 mb-4">最近动态</h3>
          <div className="space-y-2">
            {data.recentActions.slice(0, 6).map((act, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-ink-300 shrink-0 w-12">{act.time}</span>
                <span className="text-ink-600 truncate">{act.summary}</span>
              </div>
            ))}
            {data.recentActions.length === 0 && (
              <p className="text-xs text-ink-400">暂无操作记录</p>
            )}
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "闲吟录", desc: "智能解析与创作", href: "/admin/xianyin", icon: Sparkles },
          { label: "辑古台", desc: "导入经典篇目", href: "/admin/jigu-tai", icon: BookOpen },
          { label: "读音审校", desc: "通假字词典管理", href: "/admin/pinyin-dict", icon: Volume2 },
          { label: "审计报告", desc: "馆藏数据统计", href: "/admin/audit", icon: FileText },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-white border border-paper-200 rounded-xl p-4 hover:shadow-sm hover:border-paper-300 transition-all group"
          >
            <item.icon size={18} className="text-ink-400 group-hover:text-accent transition-colors mb-2" />
            <p className="text-sm font-medium text-ink-700">{item.label}</p>
            <p className="text-xs text-ink-400 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
