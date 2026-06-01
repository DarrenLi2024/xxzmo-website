"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  PenLine,
  BookOpen,
  Plus,
  Upload,
  Sparkles,
  Settings,
  Tags,
  Image,
  Search,
} from "lucide-react"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [onOpenChange])

  const groups = [
    {
      heading: "快速操作",
      items: [
        { label: "新建樗栎集文章", icon: PenLine, action: () => router.push("/admin/chuli/new") },
        { label: "新建辑古录文章", icon: BookOpen, action: () => router.push("/admin/jigu/new") },
        { label: "批量导入", icon: Upload, action: () => router.push("/admin/chuli/import") },
        { label: "辑古台 AI 生成", icon: Sparkles, action: () => router.push("/admin/jigu-tai") },
        { label: "标签管理", icon: Tags, action: () => router.push("/admin/tags") },
        { label: "配图库", icon: Image, action: () => router.push("/admin/paintings") },
        { label: "系统设置", icon: Settings, action: () => router.push("/admin/settings") },
      ],
    },
    {
      heading: "页面导航",
      items: [
        { label: "仪表盘", icon: Search, action: () => router.push("/admin") },
        { label: "樗栎集管理", icon: PenLine, action: () => router.push("/admin/chuli") },
        { label: "辑古录管理", icon: BookOpen, action: () => router.push("/admin/jigu") },
      ],
    },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="搜索文章、操作..." />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                key={item.label}
                value={item.label}
                onSelect={() => {
                  item.action()
                  onOpenChange(false)
                }}
              >
                <item.icon size={16} className="mr-2" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}