"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center">
      <h1 className="text-6xl font-serif text-ink-200 mb-6">500</h1>
      <p className="text-ink-300 font-kai text-lg mb-8">页面出了点问题</p>
      <button
        onClick={reset}
        className="inline-block px-6 py-2.5 rounded-md bg-accent text-white text-sm hover:bg-accent-dim transition-colors"
      >
        重试
      </button>
    </div>
  );
}
