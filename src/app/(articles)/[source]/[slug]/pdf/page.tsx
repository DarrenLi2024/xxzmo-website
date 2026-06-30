import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticlePdfPreview } from "@/components/article/ArticlePdfPreview";

interface Props {
  params: Promise<{ source: string; slug: string }>;
}

// 30 秒 ISR 缓存
export const revalidate = 30;
export const dynamicParams = true;

async function getArticle(source: string, slug: string) {
  return prisma.article.findFirst({
    where: { slug, source, status: "published" },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { source, slug } = await params;
  const article = await getArticle(source, decodeURIComponent(slug));
  return {
    title: article ? `${article.title} PDF预览` : "PDF预览",
  };
}

export default async function ArticlePdfPage({ params }: Props) {
  const { source, slug } = await params;
  const article = await getArticle(source, decodeURIComponent(slug));

  if (!article) notFound();

  return (
    <ArticlePdfPreview
      article={{
        id: article.id,
        title: article.title,
        source: article.source,
        type: article.type,
        author: article.author,
        dateRaw: article.dateRaw,
        preface: article.preface,
        body: article.body,
        postscript: article.postscript,
        notes: article.notes,
        translation: article.translation,
        appreciation: article.appreciation,
      }}
      annotations={parseAnnotations(article.annotations)}
    />
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
