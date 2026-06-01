"use client";

import { AdminArticleList } from "@/components/admin/AdminArticleList";

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
