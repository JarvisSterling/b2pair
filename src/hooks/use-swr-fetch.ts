import useSWR, { type SWRConfiguration } from "swr";

/**
 * Generic fetcher for SWR - fetches JSON from any URL.
 */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Drop-in replacement for the useEffect+fetch+setState pattern.
 * 
 * Benefits over raw useEffect:
 * - Instant cache: shows previous data immediately on re-navigation
 * - Background revalidation: fetches fresh data silently
 * - Deduplication: multiple components using the same key share one request
 * - Focus revalidation: refetches when user returns to the tab
 * 
 * Usage:
 *   const { data, isLoading, mutate } = useSWRFetch<MyType>(`/api/things/${id}`);
 */
export function useSWRFetch<T = any>(
  url: string | null,
  config?: SWRConfiguration<T>
) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    ...config,
  });
}

/**
 * Fetch multiple URLs in parallel, keyed by a composite key.
 * Returns the combined result via a custom fetcher.
 */
export function useSWRMultiFetch<T = any>(
  key: string | null,
  urls: string[],
  combiner: (results: any[]) => T,
  config?: SWRConfiguration<T>
) {
  return useSWR<T>(
    key,
    async () => {
      const results = await Promise.all(
        urls.map((url) => fetch(url).then((r) => r.json()))
      );
      return combiner(results);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      ...config,
    }
  );
}
