import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeArticleListItem } from "@/lib/serialize";
import { ArticleCard } from "@/components/article/ArticleCard";
import { TypeTabBar } from "@/components/common/TypeTabBar";
import { TypeFilterClient } from "./TypeFilterClient";

export const revalidate = 60;

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

interface Props {
  params: Promise<{ source: string }>;
}

async function getArticles(source: string) {
  const articles = await prisma.article.findMany({
    where: { source, status: "published" },
    include: { tags: { include: { tag: true } }, painting: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return articles.map((a) => serializeArticleListItem(a, 200));
}

export default async function SourceListPage({ params }: Props) {
  const { source } = await params;
  if (!META[source]) notFound();

  const articles = await getArticles(source);

  const allTypes = ["全部", ...Array.from(new Set(articles.map((a) => a.type || "诗"))).sort()];
  const typeCounts: Record<string, number> = {};
  for (const a of articles) {
    const t = a.type || "诗";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif text-ink-900 mb-1 tracking-wide">
        {META[source]?.title || source}
      </h1>
      <p className="text-sm text-ink-400 mb-6 font-kai">
        {META[source]?.description} · {articles.length} 篇
      </p>

{allTypes.length > 2 ? (
        <TypeFilterClient
          types={allTypes}
          typeCounts={typeCounts}
          articles={articles}
        />
      ) : (
        <div className="space-y-4">
          {articles.map((article, i) => (
            <div
              key={article.id}
              className="animate-in fade-in slide-in-from-bottom-3"
              style={{
                animationDelay: `${Math.min(i * 60, 400)}ms`,
                animationDuration: "400ms",
                animationFillMode: "both",
              }}
            >
              <ArticleCard
                slug={article.slug}
                title={article.title}
                type={article.type}
                author={article.author}
                dateRaw={article.dateRaw}
                body={article.body}
                tags={article.tags}
                source={article.source}
                painting={article.painting}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}