import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useArticles(params?: { type?: string; tag?: string; page?: number }) {
  return useQuery({
    queryKey: ["articles", params],
    queryFn: () => api.articles.list(params),
  });
}

export function useArticle(slug: string) {
  return useQuery({
    queryKey: ["article", slug],
    queryFn: () => api.articles.get(slug),
    enabled: !!slug,
  });
}

export function useArticleSearch(q: string) {
  return useQuery({
    queryKey: ["articles", "search", q],
    queryFn: () => api.articles.search(q),
    enabled: q.length >= 2,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => api.tags.list(),
  });
}

export function usePaintings(params?: { page?: number }) {
  return useQuery({
    queryKey: ["paintings", params],
    queryFn: () => api.paintings.list(params),
  });
}

export function useDailyQuote() {
  return useQuery({
    queryKey: ["dailyQuote"],
    queryFn: () => api.dailyQuote.get(),
    staleTime: 1000 * 60 * 30,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.stats.get(),
  });
}

export function useSiteConfig() {
  return useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => api.siteConfig.get(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => api.like.toggle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}