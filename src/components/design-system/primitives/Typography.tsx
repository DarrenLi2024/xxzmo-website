import { cn } from "@/lib/utils";

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function H1({ children, className, as: Component = "h1" }: TypographyProps) {
  return (
    <Component className={cn("text-4xl font-serif tracking-wider text-ink-900", className)}>
      {children}
    </Component>
  );
}

export function H2({ children, className, as: Component = "h2" }: TypographyProps) {
  return (
    <Component className={cn("text-3xl font-serif tracking-wide text-ink-900", className)}>
      {children}
    </Component>
  );
}

export function H3({ children, className, as: Component = "h3" }: TypographyProps) {
  return (
    <Component className={cn("text-2xl font-serif text-ink-900", className)}>
      {children}
    </Component>
  );
}

export function H4({ children, className, as: Component = "h4" }: TypographyProps) {
  return (
    <Component className={cn("text-xl font-serif text-ink-900", className)}>
      {children}
    </Component>
  );
}

export function Title({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component className={cn("text-lg font-medium text-ink-900", className)}>
      {children}
    </Component>
  );
}

export function Subtitle({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component className={cn("text-base text-ink-500", className)}>
      {children}
    </Component>
  );
}

export function Body({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component className={cn("text-base leading-relaxed text-ink-700", className)}>
      {children}
    </Component>
  );
}

export function Caption({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component className={cn("text-sm text-ink-500", className)}>
      {children}
    </Component>
  );
}

export function Label({ children, className, as: Component = "span" }: TypographyProps) {
  return (
    <Component className={cn("text-xs font-medium uppercase tracking-wider text-ink-500", className)}>
      {children}
    </Component>
  );
}

export function Link({
  children,
  className,
  href,
  external,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "text-accent hover:text-accent-dim transition-colors duration-200 underline-offset-4 hover:underline",
        className
      )}
    >
      {children}
    </a>
  );
}

export function Quote({ children, className, as: Component = "blockquote" }: TypographyProps) {
  return (
    <Component className={cn(
      "border-l-4 border-accent pl-4 italic text-ink-600 font-kai",
      className
    )}>
      {children}
    </Component>
  );
}