import { Suspense } from "react";
import { searchArticles } from "@/lib/search-server";
import { SearchClient } from "./SearchClient";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; tag?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", tag = "" } = await searchParams;
  const initialResults = q || tag ? await searchArticles(q, tag) : null;

  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-12 text-ink-400">加载中...</div>}>
      <SearchClient initialQuery={q} initialTag={tag} initialResults={initialResults} />
    </Suspense>
  );
}
