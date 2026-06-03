"use client";


import { useParams } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";

export default function AdminJiguEditPage() {
  const params = useParams<{ id: string }>();
  return <ArticleForm source="jigu" mode="edit" articleId={params.id} />;
}