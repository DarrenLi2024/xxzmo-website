"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("GlobalError caught:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-paper-50">
          <div className="text-center max-w-lg px-4">
            <p className="text-xs text-ink-400 mb-4 font-mono break-all">
              {error?.message || "Unknown error"}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-md bg-accent text-white text-sm hover:bg-accent-dim transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
