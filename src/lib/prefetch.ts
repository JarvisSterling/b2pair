import { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Prefetch a URL into SWR cache silently.
 * If already cached, does nothing (unless force=true).
 */
export function prefetch(url: string) {
  // mutate with fetcher populates the cache without triggering re-renders
  mutate(url, fetcher(url), { revalidate: false });
}

/**
 * Prefetch all event overview data for a list of event IDs.
 * Call this on workspace page load.
 */
export function prefetchEventOverviews(eventIds: string[]) {
  eventIds.forEach((id) => {
    prefetch(`/api/events/${id}/overview`);
  });
}

/**
 * Prefetch all tab data for an event.
 * Call this on event overview page load.
 */
export function prefetchEventTabs(eventId: string) {
  const urls = [
    `/api/events/${eventId}/analytics`,
    `/api/events/${eventId}/participants`,
    `/api/events/${eventId}/matching`,
    `/api/events/${eventId}/partners`,
    `/api/events/${eventId}/checkin`,
    `/api/events/${eventId}/configure`,
    `/api/events/${eventId}/participant-types`,
    `/api/events/${eventId}/sponsors`,
  ];
  urls.forEach((url) => prefetch(url));
}
