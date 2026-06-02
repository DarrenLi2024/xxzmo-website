"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";

export default function AdminChuliEditPage() {
  const params = useParams<{ id: string }>();
  return <ArticleForm source="chuli" mode="edit" articleId={params.id} />;
}