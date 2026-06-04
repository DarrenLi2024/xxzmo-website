import Link from "next/link";
import Image from "next/image";
import type { ArticleListItem } from "@/lib/serialize";

export function HomeFeatured({ articles }: { articles: ArticleListItem[] }) {
  return (
    <section>
      <h2 className="text-sm font-medium text-ink-400 tracking-wider mb-4 uppercase">精选推荐</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {articles.map((a, i) => (
          <Link
            key={a.id}
            href={`/${a.source}/${a.slug}`}
            className="group relative overflow-hidden rounded-xl bg-paper-100 aspect-[17/7] hover:shadow-lg transition-all duration-300"
          >
            {a.painting && (
              <Image
                src={a.painting.thumbnail || a.painting.url}
                alt={a.painting.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">
                {a.type}
              </span>
              <h3 className="text-sm font-serif text-white font-medium mt-0.5 line-clamp-2 leading-snug">
                {a.title}
              </h3>
              {a.body && (
                <p className="text-[11px] text-white/50 mt-1 line-clamp-1 font-kai">
                  {a.body.slice(0, 40)}…
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
