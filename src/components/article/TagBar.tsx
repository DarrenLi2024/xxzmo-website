import Link from "next/link";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tags: string[];
  className?: string;
}

export function TagBar({ tags, className }: Props) {
  if (tags.length === 0) return null;

  const visible = tags.slice(0, 6);
  const overflow = tags.length - 6;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <Hash size={14} className="text-ink-300" />
      {visible.map((tag) => (
        <Link
          key={tag}
          href={`/search?tag=${encodeURIComponent(tag)}`}
          className="text-xs text-ink-500 hover:text-ink-900 no-underline transition-colors duration-150"
        >
          {tag}
        </Link>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-ink-300">+{overflow}</span>
      )}
    </div>
  );
}
