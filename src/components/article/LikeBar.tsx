"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  className?: string;
}

export function LikeBar({ slug, className }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setLiked(localStorage.getItem(`like:${slug}`) === "1");

    fetch(`/api/like?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.likeCount !== undefined) setCount(data.likeCount);
      })
      .catch((error) => {
        console.error("[LikeBar] 获取点赞数失败:", error);
      });
  }, [slug]);

  const toggle = useCallback(async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    localStorage.setItem(`like:${slug}`, next ? "1" : "0");
    if (next) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
    }

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: next ? "like" : "unlike" }),
      });
      const data = await res.json();
      if (data.likeCount !== undefined) setCount(data.likeCount);
    } catch (error) {
      console.error("[LikeBar] 点赞操作失败:", error);
      setLiked(!next);
      setCount((c) => (next ? c - 1 : c + 1));
    }
  }, [liked, slug]);

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-colors",
        liked ? "text-accent" : "text-ink-500 hover:text-accent",
        className
      )}
    >
      <Heart
        size={18}
        className={cn(
          "transition-all",
          liked && "fill-current",
          animating && "scale-125"
        )}
        style={animating ? { transform: "scale(1.3)" } : undefined}
      />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
