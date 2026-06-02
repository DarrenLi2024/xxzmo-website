import Link from "next/link";
import type { ArticleListItem } from "@/lib/serialize";

export function HomeTopicGroup({ label, articles }: { label: string; articles: ArticleListItem[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-ink-400 tracking-wider uppercase">{label}</h2>
        <span className="text-[10px] text-ink-300">{articles.length} 篇</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/${a.source}/${a.slug}`}
            className="group block p-4 rounded-lg border border-paper-200 bg-white hover:border-paper-300 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-1.5 py-0.5 bg-paper-100 rounded text-ink-500 font-medium">
                {a.type}
              </span>
            </div>
            <h3 className="text-sm font-serif text-ink-800 font-medium group-hover:text-accent transition-colors line-clamp-1">
              {a.title}
            </h3>
            {a.body && (
              <p className="text-xs text-ink-400 mt-1.5 line-clamp-2 leading-relaxed font-kai">
                {a.body.slice(0, 80)}
              </p>
            )}
            <div className="flex items-center gap-1 mt-3">
              {a.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] text-ink-300">
                  #{tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
