const API_BASE = "";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  articles: {
    list: (params?: { type?: string; tag?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set("type", params.type);
      if (params?.tag) searchParams.set("tag", params.tag);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const query = searchParams.toString();
      return fetchApi(`/api/articles${query ? `?${query}` : ""}`);
    },

    get: (slug: string) => fetchApi(`/api/articles/${slug}`),

    search: (q: string) => fetchApi(`/api/search?q=${encodeURIComponent(q)}`),
  },

  tags: {
    list: () => fetchApi("/api/tags"),
    merge: (source: string, target: string) =>
      fetchApi("/api/tags/merge", {
        method: "POST",
        body: JSON.stringify({ source, target }),
      }),
  },

  paintings: {
    list: (params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const query = searchParams.toString();
      return fetchApi(`/api/paintings${query ? `?${query}` : ""}`);
    },
    search: (q: string) =>
      fetchApi("/api/admin/paintings/search", {
        method: "POST",
        body: JSON.stringify({ query: q }),
      }),
  },

  dailyQuote: {
    get: () => fetchApi("/api/daily-quote"),
  },

  stats: {
    get: () => fetchApi("/api/stats"),
  },

  like: {
    toggle: (articleId: string) =>
      fetchApi("/api/like", {
        method: "POST",
        body: JSON.stringify({ articleId }),
      }),
  },

  siteConfig: {
    get: () => fetchApi("/api/site-config"),
  },
};

export type ApiClient = typeof api;