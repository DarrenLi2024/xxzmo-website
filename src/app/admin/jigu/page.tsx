"use client";

import dynamic from "next/dynamic";

const AdminArticleList = dynamic(
  () => import("@/components/admin/AdminArticleList").then((mod) => mod.AdminArticleList),
  {
    loading: () => <div className="py-12 text-center text-ink-400 text-sm">加载列表...</div>,
  }
);

export default function AdminJiguPage() {
  return (
    <AdminArticleList
      source="jigu"
      title="辑古录管理"
      createLabel="辑古台导入"
      createHref="/admin/jigu-tai"
      editHrefPrefix="/admin/jigu"
      previewHrefPrefix="/jigu"
      emptyText="暂无内容，前往 辑古台 导入经典"
      col2Header="作者"
      col2Key="author"
    />
  );
}
