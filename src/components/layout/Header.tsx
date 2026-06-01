"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SITE } from "@/lib/constants";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 管理后台不用前台 Header
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-paper-50/85 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-ink-900 font-serif text-lg font-medium tracking-wider no-underline"
          >
            {SITE.name}
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative text-sm transition-colors duration-150 no-underline",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "text-ink-900 font-medium"
                    : "text-ink-500 hover:text-ink-900"
                )}
              >
                {item.label}
                {(pathname === item.href || pathname.startsWith(item.href + "/")) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/search"
              className="text-ink-500 hover:text-ink-900 transition-colors"
              aria-label="搜索"
            >
              <Search size={18} />
            </Link>
            <Link
              href="/admin"
              className="text-xs text-ink-300 hover:text-ink-700 transition-colors no-underline hidden md:inline-block"
            >
              管理
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-ink-500 hover:text-ink-900 transition-colors"
              aria-label="菜单"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* 移动端全屏菜单 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-paper-50 flex flex-col items-center justify-center gap-8 md:hidden">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="text-2xl font-serif text-ink-900 no-underline animate-in fade-in slide-in-from-right-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* 占位 */}
      <div className="h-16" />
    </>
  );
}
