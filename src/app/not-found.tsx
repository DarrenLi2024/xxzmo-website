import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center">
      <h1 className="text-6xl font-serif text-ink-200 mb-6">404</h1>
      <p className="text-ink-300 font-kai text-lg mb-8">此间无踪迹</p>
      <Link
        href="/"
        className="inline-block px-6 py-2.5 rounded-md bg-accent text-white text-sm no-underline hover:bg-accent-dim transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}
