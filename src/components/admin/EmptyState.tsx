import { cn } from "@/lib/utils";
import { FileText, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = FileText, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("py-16 text-center", className)}>
      <Icon size={36} className="text-ink-300 mx-auto mb-4" strokeWidth={1.5} />
      <p className="text-ink-300 font-kai text-lg mb-2">{title}</p>
      {description && <p className="text-xs text-ink-300 mb-4">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
