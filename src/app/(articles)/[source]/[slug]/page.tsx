import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArticleDetail } from "@/components/article/ArticleDetail";
import { TagBar } from "@/components/article/TagBar";
import { LikeBar } from "@/components/article/LikeBar";

interface Props {
  params: Promise<{ source: string; slug: string }>;
}

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const articles = await prisma.article.findMany({
    where: { status: "published" },
    select: { source: true, slug: true },
  });
  return articles.map((a) => ({ source: a.source, slug: a.slug }));
}

async function getArticle(source: string, slug: string) {
  return prisma.article.findFirst({
    where: { slug, source, status: "published" },
    include: {
      tags: { include: { tag: true } },
      painting: true,
    },
  });
}

interface AdjacentArticle {
  slug: string;
  title: string;
}

async function getAdjacentArticles(source: string, currentSlug: string): Promise<{
  prev: AdjacentArticle | null;
  next: AdjacentArticle | null;
}> {
  const current = await prisma.article.findFirst({
    where: { slug: currentSlug, source, status: "published" },
    select: { createdAt: true },
  });
  if (!current) return { prev: null, next: null };

  const ts = current.createdAt;

  // createdAt 越新排越前。上一篇 = 更新的，下一篇 = 更旧的
  const [prev, next] = await Promise.all([
    prisma.article.findFirst({
      where: {
        source,
        status: "published",
        slug: { not: currentSlug },
        createdAt: { gt: ts },
      },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true },
    }),
    prisma.article.findFirst({
      where: {
        source,
        status: "published",
        slug: { not: currentSlug },
        createdAt: { lt: ts },
      },
      orderBy: { createdAt: "desc" },
      select: { slug: true, title: true },
    }),
  ]);

  return { prev, next };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { source, slug } = await params;
  const article = await getArticle(source, decodeURIComponent(slug));
  if (!article) return { title: "未找到" };
  const desc = article.body?.slice(0, 120) || "";
  return {
    title: article.title,
    description: desc,
    openGraph: { title: article.title, description: desc, type: "article" },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { source, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const article = await getArticle(source, decodedSlug);

  if (!article) {
    notFound();
  }

  const adjacent = await getAdjacentArticles(source, decodedSlug);

  const annotations = parseAnnotations(article.annotations);

  const painting = article.painting?.url.startsWith("/paintings/")
    ? { ...article.painting, tags: parseStringArray(article.painting.tags) }
    : null;

  const tags = article.tags.map((t) => t.tag.name);

  return (
    <article className="article-reading-page max-w-4xl mx-auto px-4 py-6 md:py-10">
      <div className="bg-white px-6 py-8 md:px-12 md:py-12 shadow-sm ring-1 ring-paper-200">
        <ArticleDetail
          articleId={article.id}
          title={article.title}
          subtitle={article.subtitle}
          author={article.author}
          dateRaw={article.dateRaw}
          source={article.source}
          type={article.type}
          preface={article.preface}
          body={article.body}
          postscript={article.postscript}
          notes={article.notes}
          annotations={annotations}
          translation={article.translation}
          appreciation={article.appreciation}
          pdfHref={`/${article.source}/${article.slug}/pdf`}
        />

      <div className="article-actions flex items-center justify-between mt-10 pt-6 border-t border-paper-200">
        <TagBar tags={tags} />
        <LikeBar slug={article.slug} />
      </div>

      {painting && (
        <div className="article-painting mt-10 pt-6 border-t border-paper-200">
          <figure className="mt-4">
            <div className="aspect-[17/7] w-full overflow-hidden rounded bg-paper-100 relative">
              <Image
                src={painting.thumbnail || painting.url}
                alt={painting.title}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
                style={{ objectPosition: "50% 30%" }}
                priority
              />
            </div>
            <figcaption className="text-xs text-ink-400 mt-2 text-center">
              配图：{painting.title}{painting.artist ? ` · ${painting.artist}` : ""}{painting.dynasty ? ` (${painting.dynasty})` : ""}
              <span className="ml-2 text-ink-300">本地上传配图</span>
            </figcaption>
          </figure>
        </div>
      )}

      </div>

      {(adjacent.prev || adjacent.next) && (
        <nav className="mt-10 pt-6 border-t border-paper-200 flex justify-between items-start gap-4">
          {adjacent.prev ? (
            <Link
              href={`/${source}/${adjacent.prev.slug}`}
              className="group flex-1 min-w-0 text-left no-underline"
            >
              <span className="block text-xs text-ink-400 mb-1">← 上一篇</span>
              <span className="text-sm text-ink-700 group-hover:text-accent transition-colors line-clamp-1 font-serif">
                {adjacent.prev.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {adjacent.next ? (
            <Link
              href={`/${source}/${adjacent.next.slug}`}
              className="group flex-1 min-w-0 text-right no-underline"
            >
              <span className="block text-xs text-ink-400 mb-1">下一篇 →</span>
              <span className="text-sm text-ink-700 group-hover:text-accent transition-colors line-clamp-1 font-serif">
                {adjacent.next.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      )}
    </article>
  );
}

function parseAnnotations(raw: string | null): { term: string; explanation: string }[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (item): item is { term: string; explanation: string } =>
        typeof item?.term === "string" && typeof item?.explanation === "string"
    );
  } catch {
    return null;
  }
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
