"use client";


import { useState, useEffect } from "react";
import { FileText, BookOpen, Tag, TrendingUp, Calendar, PieChart, Loader2 } from "lucide-react";

interface AuditData {
  totalArticles: number;
  byType: Record<string, number>;
  bySource: { chuli: number; jigu: number };
  byStatus: { draft: number; review: number; published: number };
  byMonth: { month: string; count: number }[];
  topTags: { name: string; count: number }[];
  avgBodyLength: number;
  withAnnotations: number;
  withPinyin: number;
  withPainting: number;
  withTranslation: number;
  withAppreciation: number;
  generatedAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  "诗": "#C4825A", "词": "#5B8C5B", "曲": "#8B5E8B", "赋": "#C49B4E",
  "文": "#4A7FA7", "联": "#A0522D", "新诗": "#6A9FB5", "打油诗": "#D4A76A",
  "四言": "#8B7355", "六言": "#7B8B6F", "杂言": "#9B8B7B",
  "骚体": "#B5651D", "长短句": "#8B6914", "剧本": "#5F6B7B",
  "朗诵稿": "#6B8B7B", "随笔": "#7B8B8B", "日记": "#A0A0A0"
};

export default function AuditReportPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="admin-content flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-ink-400" size={24} />
    </div>
  );

  if (!data) return (
    <div className="admin-content py-12 text-center text-ink-400">数据加载失败</div>
  );

  const sortedTypes = Object.entries(data.byType).sort((a, b) => b[1] - a[1]);
  const maxTypeCount = Math.max(...sortedTypes.map(([,c]) => c), 1);

  return (
    <div className="admin-content max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-ink-900 flex items-center gap-2">
          <FileText size={22} className="text-accent" /> 馆藏审计报告
        </h1>
        <p className="text-sm text-ink-400 mt-1">
          生成时间：{new Date(data.generatedAt).toLocaleString("zh-CN")}
        </p>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BookOpen, label: "总篇数", value: data.totalArticles, color: "text-ink-900" },
          { icon: Tag, label: "体裁数", value: Object.keys(data.byType).length, color: "text-accent" },
          { icon: TrendingUp, label: "已发布", value: data.byStatus.published, color: "text-green" },
          { icon: Calendar, label: "含注释", value: data.withAnnotations, color: "text-amber" },
        ].map(card => (
          <div key={card.label} className="bg-white border border-paper-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <card.icon size={18} className={card.color + " mb-2"} />
            <p className="text-2xl font-bold text-ink-900">{card.value}</p>
            <p className="text-xs text-ink-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 体裁分布 */}
        <div className="bg-white border border-paper-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-ink-700 mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-accent" /> 体裁分布
          </h2>
          <div className="space-y-2">
            {sortedTypes.map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-xs text-ink-600 w-12 shrink-0 text-right">{type}</span>
                <div className="flex-1 h-5 bg-paper-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / maxTypeCount) * 100}%`,
                      backgroundColor: TYPE_COLORS[type] || "#C4825A",
                    }}
                  />
                </div>
                <span className="text-xs text-ink-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 月度趋势 */}
        <div className="bg-white border border-paper-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-ink-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" /> 创作时间线（近12月）
          </h2>
          <div className="space-y-1.5">
            {data.byMonth.slice(-12).map((m) => (
              <div key={m.month} className="flex items-center gap-2 text-xs">
                <span className="text-ink-400 w-16 shrink-0">{m.month}</span>
                <div className="flex-1 h-4 bg-paper-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/60 rounded-full"
                    style={{
                      width: `${Math.min((m.count / Math.max(...data.byMonth.map(x => x.count), 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-ink-500 w-5 text-right">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 数据完整度 */}
        <div className="bg-white border border-paper-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-ink-700 mb-4">数据完整度</h2>
          <div className="space-y-3">
            {[
              { label: "含注释", value: data.withAnnotations, total: data.totalArticles },
              { label: "含译文", value: data.withTranslation, total: data.totalArticles },
              { label: "含赏析", value: data.withAppreciation, total: data.totalArticles },
              { label: "含拼音", value: data.withPinyin, total: data.totalArticles },
              { label: "有配图", value: data.withPainting, total: data.totalArticles },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-ink-500 w-16">{item.label}</span>
                <div className="flex-1 h-4 bg-paper-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green/60 rounded-full"
                    style={{ width: `${(item.value / item.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-ink-400 w-16 text-right">
                  {item.value}/{item.total}
                </span>
              </div>
            ))}
          </div>
          {data.avgBodyLength > 0 && (
            <p className="text-xs text-ink-400 mt-4 pt-4 border-t border-paper-100">
              平均正文字数：{Math.round(data.avgBodyLength)} 字
            </p>
          )}
        </div>

        {/* 热门标签 */}
        <div className="bg-white border border-paper-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-ink-700 mb-4 flex items-center gap-2">
            <Tag size={16} className="text-accent" /> 热门标签
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.topTags.slice(0, 20).map((t, i) => (
              <span
                key={t.name}
                className="px-2.5 py-1 rounded-full text-xs border transition-colors"
                style={{
                  color: TYPE_COLORS[Object.keys(TYPE_COLORS)[i % Object.keys(TYPE_COLORS).length]],
                  borderColor: TYPE_COLORS[Object.keys(TYPE_COLORS)[i % Object.keys(TYPE_COLORS).length]] + "40",
                  backgroundColor: TYPE_COLORS[Object.keys(TYPE_COLORS)[i % Object.keys(TYPE_COLORS).length]] + "10",
                }}
              >
                {t.name} <span className="opacity-50 ml-0.5">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
