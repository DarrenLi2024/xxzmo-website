import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon = "🍂", title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("py-16 text-center", className)}>
      <p className="text-4xl mb-4 select-none">{icon}</p>
      <p className="text-ink-300 font-kai text-lg mb-2">{title}</p>
      {description && <p className="text-xs text-ink-300 mb-4">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
