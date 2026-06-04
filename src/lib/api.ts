import { readJson } from "@/lib/fetch-json";

const API_BASE = "";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  return readJson<T>(response);
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
    merge: (keepId: string, removeId: string) =>
      fetchApi("/api/tags/merge", {
        method: "POST",
        body: JSON.stringify({ keepId, removeId }),
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
  },

  dailyQuote: {
    get: () => fetchApi("/api/daily-quote"),
  },

  stats: {
    get: () => fetchApi("/api/stats"),
  },

  like: {
    toggle: (slug: string) =>
      fetchApi("/api/like", {
        method: "POST",
        body: JSON.stringify({ slug, action: "like" }),
      }),
    set: (slug: string, action: "like" | "unlike") =>
      fetchApi("/api/like", {
        method: "POST",
        body: JSON.stringify({ slug, action }),
      }),
  },

  siteConfig: {
    get: () => fetchApi("/api/site-config"),
  },
};

export type ApiClient = typeof api;
