"use client";

export const dynamic = "force-dynamic";

import { ArticleForm } from "@/components/admin/ArticleForm";

export default function AdminChuliNewPage() {
  return <ArticleForm source="chuli" mode="create" />;
}
