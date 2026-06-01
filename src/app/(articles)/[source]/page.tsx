import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListPage } from "./ArticleListPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ source: "chuli" }, { source: "jigu" }];
}

const META: Record<string, { title: string; description: string }> = {
  chuli: { title: "樗栎集", description: "狂野君原创诗文" },
  jigu: { title: "辑古录", description: "前人经典收藏" },
};

export async function generateMetadata({ params }: { params: Promise<{ source: string }> }): Promise<Metadata> {
  const { source } = await params;
  const m = META[source];
  if (!m) return {};
  return { title: m.title, description: m.description };
}

export default async function SourceListPage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  if (!META[source]) notFound();
  return <ArticleListPage source={source} />;
}
