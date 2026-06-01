import { cn } from "@/lib/utils";

interface Props {
  type: string;
  author: string;
  dateRaw?: string | null;
  className?: string;
}

export function ArticleMeta({ type, author, dateRaw, className }: Props) {
  return (
    <div className={cn("flex items-center gap-1.5 text-ink-500 font-kai text-sm", className)}>
      <span>{type}</span>
      <span className="text-ink-300 whitespace-nowrap select-none">&nbsp;·&nbsp;</span>
      <span>{author}</span>
      {dateRaw && (
        <>
          <span className="text-ink-300 whitespace-nowrap select-none">&nbsp;·&nbsp;</span>
          <span className="whitespace-nowrap">{dateRaw}</span>
        </>
      )}
    </div>
  );
}
