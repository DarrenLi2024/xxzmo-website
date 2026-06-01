"use client";

import { usePathname } from "next/navigation";

interface FooterContentProps {
  site: {
    name: string;
    signature: string;
    authorName: string;
  };
}

export function FooterContent({ site }: FooterContentProps) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="py-16 text-center">
      <div className="mb-4 mx-auto w-16 h-px bg-paper-300" />
      <p className="text-sm text-ink-300 leading-relaxed">
        {site.name} · {site.signature}
      </p>
      <p className="text-xs text-ink-300 mt-2">
        © 2026 {site.authorName}
      </p>
    </footer>
  );
}
