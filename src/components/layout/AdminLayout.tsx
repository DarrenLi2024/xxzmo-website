"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, ExternalLink, Search } from "lucide-react"
import { AdminSidebar } from "./AdminSidebar"
import { ToastProvider } from "@/components/admin/Toast"
import { ConfirmDialogProvider } from "@/components/admin/ConfirmDialog"
import { CommandMenu } from "@/components/admin/command-menu"
import { cn } from "@/lib/utils"

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Ignore errors, clear cookie anyway
    }
    document.cookie = "admin_token=; path=/; max-age=0"
    router.push("/admin/login")
  }

  return (
    <div className="admin-layout">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onSearchClick={() => setSearchOpen(true)}
      />

      <div className={cn("admin-main", collapsed && "admin-main.collapsed")}>
        <header className="admin-header">
          <div className="flex items-center gap-4 flex-1">
            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors md:w-64"
            >
              <Search size={14} />
              <span className="hidden md:inline">搜索文章、操作...</span>
              <kbd className="hidden md:inline-flex ml-auto text-xs bg-background px-1.5 py-0.5 rounded border border-border">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">返回前台</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>

      {/* Command Menu */}
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </ConfirmDialogProvider>
    </ToastProvider>
  )
}

export const AdminLayoutClient = AdminLayout