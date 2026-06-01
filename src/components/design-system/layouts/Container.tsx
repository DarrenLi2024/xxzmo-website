import { cn } from "@/lib/utils";

type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: ContainerSize;
  center?: boolean;
}

const sizeStyles: Record<ContainerSize, string> = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

export function Container({
  children,
  className,
  size = "lg",
  center = true,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4",
        sizeStyles[size],
        center && "w-full",
        className
      )}
    >
      {children}
    </div>
  );
}

interface GridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6;
  gap?: "sm" | "md" | "lg" | "xl";
}

const colsStyles: Record<1 | 2 | 3 | 4 | 6, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

const gapStyles: Record<string, string> = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

export function Grid({ children, className, cols = 2, gap = "md" }: GridProps) {
  return (
    <div className={cn("grid", colsStyles[cols], gapStyles[gap], className)}>
      {children}
    </div>
  );
}

interface FlexProps {
  children: React.ReactNode;
  className?: string;
  direction?: "row" | "col" | "row-reverse" | "col-reverse";
  justify?: "start" | "center" | "between" | "around" | "end";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  gap?: "sm" | "md" | "lg" | "xl";
  wrap?: boolean;
}

const flexDirection: Record<string, string> = {
  row: "flex-row",
  col: "flex-col",
  "row-reverse": "flex-row-reverse",
  "col-reverse": "flex-col-reverse",
};

const justifyContent: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  between: "justify-between",
  around: "justify-around",
  end: "justify-end",
};

const alignItems: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const flexGap: Record<string, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

export function Flex({
  children,
  className,
  direction = "row",
  justify = "start",
  align = "center",
  gap = "md",
  wrap = false,
}: FlexProps) {
  return (
    <div
      className={cn(
        "flex",
        flexDirection[direction],
        justifyContent[justify],
        alignItems[align],
        flexGap[gap],
        wrap && "flex-wrap",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SpacerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
}

const spacerSizes: Record<string, string> = {
  xs: "h-2",
  sm: "h-4",
  md: "h-8",
  lg: "h-12",
  xl: "h-16",
  "2xl": "h-24",
};

export function Spacer({ size = "md" }: SpacerProps) {
  return <div className={spacerSizes[size]} />;
}