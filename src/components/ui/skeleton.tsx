import { cn } from "@/lib/utils";

function Skeleton({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "card" | "text" | "avatar" }) {
  const variants = {
    default: "animate-pulse rounded-md bg-muted",
    card: "rounded-lg bg-paper-200 animate-shimmer",
    text: "rounded h-4 bg-paper-200",
    avatar: "rounded-full bg-paper-200",
  };

  return (
    <div
      data-slot="skeleton"
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-paper-50 rounded-lg p-6 space-y-4", className)}>
      <Skeleton variant="text" className="w-3/4 h-6" />
      <div className="flex gap-4">
        <Skeleton variant="text" className="w-20 h-4" />
        <Skeleton variant="text" className="w-20 h-4" />
        <Skeleton variant="text" className="w-20 h-4" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-2/3 h-4" />
      </div>
    </div>
  );
}

function SkeletonArticle({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-2/3 h-8" />
        <Skeleton variant="text" className="w-1/3 h-4" />
      </div>
      <div className="space-y-3">
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-3/4 h-4" />
      </div>
    </div>
  );
}

function SkeletonQuote({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg p-8 text-center space-y-4", className)}>
      <Skeleton variant="text" className="w-full h-6 mx-auto" />
      <Skeleton variant="text" className="w-1/3 h-4 mx-auto" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonArticle, SkeletonQuote };