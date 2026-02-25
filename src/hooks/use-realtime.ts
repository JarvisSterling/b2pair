import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface SubscriptionConfig {
  /** Supabase table name */
  table: string;
  /** Optional: filter by column eq value (e.g. { event_id: "abc" }) */
  filter?: Record<string, string>;
  /** Which events to listen to */
  event?: RealtimeEvent;
  /** Callback when a change is detected */
  onChanged: (payload: any) => void;
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Automatically cleans up on unmount.
 * 
 * Usage:
 *   useRealtime({
 *     table: "companies",
 *     filter: { event_id: eventId },
 *     onChanged: () => mutate(), // re-fetch via SWR
 *   });
 */
export function useRealtime(config: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { table, filter, event = "*", onChanged } = config;

    // Build the filter string for Supabase realtime
    // e.g. "event_id=eq.abc"
    let filterStr: string | undefined;
    if (filter) {
      const entries = Object.entries(filter);
      if (entries.length === 1) {
        const [col, val] = entries[0];
        filterStr = `${col}=eq.${val}`;
      }
    }

    const channelName = `realtime-${table}-${filterStr || "all"}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const subscriptionConfig: any = {
      event,
      schema: "public",
      table,
    };

    if (filterStr) {
      subscriptionConfig.filter = filterStr;
    }

    channel
      .on("postgres_changes", subscriptionConfig, (payload: any) => {
        onChanged(payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table, JSON.stringify(config.filter)]);
}

/**
 * Subscribe to multiple tables at once.
 * All changes trigger the same onChanged callback (typically a mutate()).
 */
export function useRealtimeMulti(
  tables: { table: string; filter?: Record<string, string> }[],
  onChanged: () => void
) {
  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    tables.forEach(({ table, filter }, i) => {
      let filterStr: string | undefined;
      if (filter) {
        const entries = Object.entries(filter);
        if (entries.length === 1) {
          const [col, val] = entries[0];
          filterStr = `${col}=eq.${val}`;
        }
      }

      const channel = supabase.channel(`rt-multi-${table}-${i}-${Date.now()}`);
      const subConfig: any = {
        event: "*",
        schema: "public",
        table,
      };
      if (filterStr) subConfig.filter = filterStr;

      channel.on("postgres_changes", subConfig, () => onChanged()).subscribe();
      channels.push(channel);
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tables)]);
}
