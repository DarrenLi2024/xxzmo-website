"use client";


import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const redirect = searchParams.get("redirect") || "/admin";
        router.replace(redirect);
      } else {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error || (res.status === 401 ? "密码错误" : "登录失败，请重试"));
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-50">
      <div className="w-full max-w-sm mx-4">
        <h1 className="text-2xl font-serif text-ink-900 text-center mb-2">闲心子墨</h1>
        <p className="text-sm text-ink-500 text-center mb-8">管理后台</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理密码"
              className="w-full px-4 py-3 rounded-md border border-paper-300 bg-white text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 focus:shadow-sm transition-all"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-red text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-accent text-white rounded-md text-sm hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "验证中..." : "进入后台"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-paper-50">
        <p className="text-ink-300">加载中...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
