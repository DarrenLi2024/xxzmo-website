"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-paper-50">
          <div className="text-center">
            <h1 className="text-6xl font-serif text-ink-200 mb-6">500</h1>
            <p className="text-ink-300 font-kai text-lg mb-8">系统出了点问题</p>
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
