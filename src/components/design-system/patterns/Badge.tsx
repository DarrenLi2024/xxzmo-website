import { cn } from "@/lib/utils";
import Link from "next/link";

type BadgeVariant = "default" | "accent" | "outline" | "soft";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  href?: string;
  onClick?: () => void;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-ink-100 text-ink-700",
  accent: "bg-accent text-white",
  outline: "bg-transparent border border-ink-200 text-ink-600",
  soft: "bg-accent/10 text-accent",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
};

export function Badge({
  children,
  className,
  variant = "default",
  size = "sm",
  href,
  onClick,
}: BadgeProps) {
  const baseStyles = cn(
    "inline-flex items-center rounded-full font-medium transition-all duration-200",
    variantStyles[variant],
    sizeStyles[size],
    href && "hover:opacity-80",
    !href && !onClick && "cursor-default"
  );

  const content = (
    <span className={cn("truncate max-w-[120px]", className)}>
      {children}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={baseStyles}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={cn(baseStyles, "cursor-pointer")}>
        {content}
      </button>
    );
  }

  return <span className={baseStyles}>{content}</span>;
}

interface TagListProps {
  tags: string[];
  hrefPrefix?: string;
  className?: string;
}

export function TagList({ tags, hrefPrefix = "/tags/", className }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <Badge key={tag} variant="soft" href={`${hrefPrefix}${encodeURIComponent(tag)}`}>
          {tag}
        </Badge>
      ))}
    </div>
  );
}