import Link from "next/link";
import Image from "next/image";
import { ArticleMeta } from "./ArticleMeta";
import { TagBar } from "./TagBar";
import type { PaintingInfo } from "@/lib/serialize";

interface Props {
  slug: string;
  title: string;
  type: string;
  author: string;
  dateRaw?: string | null;
  body?: string;
  tags: string[];
  source: string;
  painting?: PaintingInfo | null;
}

export function ArticleCard({
  slug,
  title,
  type,
  author,
  dateRaw,
  body,
  tags,
  source,
  painting,
}: Props) {
  const generateExcerpt = (text: string, maxLength: number = 200): { text: string; hasMore: boolean } => {
    if (!text) return { text: "", hasMore: false };
    
    const normalizedText = text.replace(/\n/g, " ");
    
    if (normalizedText.length <= maxLength) {
      return { text: normalizedText, hasMore: false };
    }
    
    const truncated = normalizedText.slice(0, maxLength);
    const lastPeriodIndex = truncated.lastIndexOf("。");
    
    if (lastPeriodIndex > 0) {
      return { 
        text: normalizedText.slice(0, lastPeriodIndex + 1), 
        hasMore: true 
      };
    }
    
    const lastCommaIndex = Math.max(
      truncated.lastIndexOf("，"),
      truncated.lastIndexOf("、")
    );
    
    if (lastCommaIndex > maxLength * 0.6) {
      return { 
        text: normalizedText.slice(0, lastCommaIndex + 1), 
        hasMore: true 
      };
    }
    
    return { 
      text: normalizedText.slice(0, maxLength) + "……", 
      hasMore: true 
    };
  };
  
  const { text: excerptText, hasMore } = generateExcerpt(body || "", 200);

  const articleUrl = `/${source}/${slug}`;

  return (
    <Link
      href={articleUrl}
      className="block group bg-white border border-paper-200 rounded overflow-hidden transition-shadow duration-300 hover:shadow-md cursor-pointer"
    >
      <article>
        {painting && (
          <div className="block overflow-hidden">
            <div className="aspect-[17/7] overflow-hidden relative">
              <Image
                src={painting.thumbnail || painting.url}
                alt={painting.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>
        )}
        <div className="px-6 py-5 md:px-8 md:py-6">
          <h3 className="text-lg md:text-xl font-serif text-ink-900 font-medium tracking-wide mb-1.5 md:mb-2 group-hover:text-accent transition-colors duration-200">
            {title}
          </h3>
          <ArticleMeta type={type} author={author} dateRaw={dateRaw} className="mb-3 md:mb-4" />
          <p className="text-sm md:text-base text-ink-500 mb-3 font-serif group-hover:text-ink-600 transition-colors duration-200" style={{lineHeight: 1.7, letterSpacing: '0.03em'}}>
            {excerptText}
            {hasMore && (
              <span className="inline-block ml-1 article-read-more transition-colors">
                （阅读全文）
              </span>
            )}
          </p>
          <TagBar tags={tags} />
        </div>
      </article>
    </Link>
  );
}
