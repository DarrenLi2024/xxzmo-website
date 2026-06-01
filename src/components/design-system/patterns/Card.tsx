import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "outline" | "ghost";
type CardSize = "sm" | "md" | "lg";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-paper-50 border border-paper-200",
  elevated: "bg-white border border-paper-200 shadow-sm",
  outline: "bg-transparent border border-ink-100",
  ghost: "bg-transparent",
};

const sizeStyles: Record<CardSize, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  className,
  variant = "default",
  size = "md",
  interactive = false,
  onClick,
  hoverable = false,
}: CardProps) {
  const baseStyles = cn(
    "rounded transition-all duration-300",
    variantStyles[variant],
    sizeStyles[size],
    hoverable && "hover:shadow-md hover:border-accent/30 cursor-pointer"
  );

  if (interactive || hoverable) {
    return (
      <div
        className={cn(baseStyles, className, "animate-fade-in")}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cn(baseStyles, className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn("", className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-ink-100", className)}>
      {children}
    </div>
  );
}