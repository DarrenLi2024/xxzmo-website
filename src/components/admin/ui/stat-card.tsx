"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  trend?: { value: number; label?: string }
  href?: string
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
  className,
}: StatCardProps) {
  const content = (
    <div className={cn("group block bg-card border border-border rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5", className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-accent/10">
          <Icon size={20} className="text-accent" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-semibold text-foreground tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium pb-1",
            trend.value > 0 ? "text-green" : trend.value < 0 ? "text-red" : "text-muted-foreground"
          )}>
            {trend.value > 0 ? <TrendingUp size={14} /> : trend.value < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
            {Math.abs(trend.value)}%
            {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
          </span>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }

  return content
}