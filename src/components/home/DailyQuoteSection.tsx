import { Quote } from "lucide-react";
import type { DailyQuoteData } from "@/lib/daily-quote-server";
import { DailyQuoteModal } from "@/components/home/DailyQuoteModal";

function resolveSourceLabel(source: string) {
  if (source === "from_collection") return "樗栎集";
  if (source === "ai_generated") return "AI 生成";
  return "";
}

export function DailyQuoteSection({ quote }: { quote: DailyQuoteData }) {
  const content = quote.content?.trim() || "";
  if (!content || content === "待山房主人挥毫...") {
    return (
      <section className="text-center">
        <div className="max-w-lg mx-auto p-8">
          <Quote size={24} className="text-ink-200 mx-auto mb-3" />
          <p className="text-ink-300 font-kai text-base">待山房主人挥毫...</p>
        </div>
      </section>
    );
  }

  const sourceLabel = resolveSourceLabel(quote.source);
  const sourceNote = quote.source === "from_collection" ? "来源：樗栎集" : "AI 生成";

  return (
    <section className="text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <div className="max-w-lg mx-auto p-8 bg-white rounded-2xl border border-paper-200 shadow-sm">
        <p className="font-kai text-lg text-ink-700 leading-loose">
          &ldquo;{content}&rdquo;
        </p>
        {sourceLabel && (
          <p className="text-xs text-ink-400 mt-4">—— {sourceLabel}</p>
        )}
      </div>

      <DailyQuoteModal
        content={content}
        sourceLabel={sourceLabel}
        sourceNote={sourceNote}
      />
    </section>
  );
}
