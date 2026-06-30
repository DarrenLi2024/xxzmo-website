"use client";

import dynamic from "next/dynamic";

const ArticleForm = dynamic(
  () => import("@/components/admin/ArticleForm").then((mod) => mod.ArticleForm),
  { loading: () => <div className="py-12 text-center text-ink-400 text-sm">加载编辑器...</div> }
);

export default function AdminChuliNewPage() {
  return <ArticleForm source="chuli" mode="create" />;
}
