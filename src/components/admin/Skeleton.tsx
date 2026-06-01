import { cn } from "@/lib/utils";

interface SkeletonProps {
  variant?: "text" | "card" | "table-row" | "form" | "circle";
  className?: string;
  count?: number;
}

export function Skeleton({ variant = "text", className, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderItem = (key: number) => {
    switch (variant) {
      case "card":
        return (
          <div key={key} className={cn("bg-paper-50 rounded-lg p-6 space-y-3", className)}>
            <div className="h-6 bg-paper-200 rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-paper-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-paper-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-paper-200 rounded w-3/4 animate-pulse" />
          </div>
        );
      case "table-row":
        return (
          <div key={key} className={cn("h-12 bg-paper-100 rounded animate-pulse", className)} />
        );
      case "form":
        return (
          <div key={key} className={cn("space-y-4", className)}>
            <div className="h-8 bg-paper-200 rounded w-1/4 animate-pulse" />
            <div className="h-64 bg-paper-200 rounded animate-pulse" />
          </div>
        );
      case "circle":
        return (
          <div key={key} className={cn("rounded-full bg-paper-200 animate-pulse", className)} />
        );
      default:
        return (
          <div key={key} className={cn("h-4 bg-paper-200 rounded animate-pulse", className)} />
        );
    }
  };

  return <>{items.map(renderItem)}</>;
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs text-ink-400 border-b border-paper-200 bg-paper-100 rounded-t-lg">
        <span className="col-span-5 h-3 bg-paper-200 rounded animate-pulse" />
        <span className="col-span-2 h-3 bg-paper-200 rounded animate-pulse" />
        <span className="col-span-1 h-3 bg-paper-200 rounded animate-pulse" />
        <span className="col-span-2 h-3 bg-paper-200 rounded animate-pulse" />
        <span className="col-span-2 h-3 bg-paper-200 rounded animate-pulse" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 bg-paper-100 rounded animate-pulse" />
      ))}
    </div>
  );
}
