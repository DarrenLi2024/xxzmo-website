"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  PenLine,
  BookOpen,
  Sparkles,
  Tags,
  Image,
  Plug,
  Settings,
  ChevronLeft,
  Sun,
  Moon,
  Search,
} from "lucide-react"
import { useState, useEffect } from "react"

const iconMap = {
  LayoutDashboard,
  PenLine,
  BookOpen,
  Sparkles,
  Tags,
  Image,
  Plug,
  Settings,
  Search,
}

const groups = [
  {
    label: "总览",
    items: [{ label: "馆藏总览", href: "/admin", icon: "LayoutDashboard" }],
  },
  {
    label: "创作入库",
    items: [
      { label: "闲吟录", href: "/admin/xianyin", icon: "Sparkles" },
      { label: "樗栎集管理", href: "/admin/chuli", icon: "PenLine" },
    ],
  },
  {
    label: "辑校典藏",
    items: [
      { label: "辑古台", href: "/admin/jigu-tai", icon: "BookOpen" },
      { label: "辑古录管理", href: "/admin/jigu", icon: "Tags" },
      { label: "雅风阁", href: "/admin/yafengge", icon: "Search" },
      { label: "配图库", href: "/admin/paintings", icon: "Image" },
    ],
  },
  {
    label: "系统运营",
    items: [
      { label: "API 配置", href: "/admin/api-config", icon: "Plug" },
      { label: "系统设置", href: "/admin/settings", icon: "Settings" },
    ],
  },
]

interface AdminSidebarProps {
  collapsed: boolean
  onToggle: () => void
  onSearchClick?: () => void
}

export function AdminSidebar({ collapsed, onToggle, onSearchClick }: AdminSidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-30",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/admin" className="font-serif text-ink-900 text-sm font-medium tracking-wider">
            闲心子墨
          </Link>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-sidebar-accent",
            collapsed && "mx-auto"
          )}
        >
          <ChevronLeft
            size={18}
            className={cn("transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Search Button (Visible when collapsed) */}
      {collapsed && onSearchClick && (
        <div className="px-2 py-3 border-b border-sidebar-border">
          <button
            onClick={onSearchClick}
            className="w-full p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors flex items-center justify-center"
          >
            <Search size={18} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[0.68rem] font-medium tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap]
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-l-sidebar-primary"
                      : "text-sidebar-foreground",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? `${group.label} · ${item.label}` : undefined}
                >
                  <Icon size={20} strokeWidth={1.5} className={cn(isActive && "text-sidebar-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer with Theme Toggle */}
      {mounted && (
        <div className="px-2 py-4 border-t border-sidebar-border">
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "切换主题" : undefined}
          >
            <Sun size={20} className="dark:hidden" />
            <Moon size={20} className="hidden dark:block" />
            {!collapsed && <span>切换主题</span>}
          </button>
        </div>
      )}
    </aside>
  )
}
