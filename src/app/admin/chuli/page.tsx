"use client";

import { AdminArticleList } from "@/components/admin/AdminArticleList";

export default function AdminChuliPage() {
  return (
    <AdminArticleList
      source="chuli"
      title="樗栎集管理"
      createLabel="新建"
      importHref="/admin/chuli/import"
      importLabel="导入"
      createHref="/admin/chuli/new"
      editHrefPrefix="/admin/chuli"
      previewHrefPrefix="/chuli"
      emptyText="暂无内容"
      col2Header="类型"
      col2Key="type"
    />
  );
}
