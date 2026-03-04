"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar,
  Check,
  MessageSquare,
  Zap,
  Building2,
  Bell,
  X,
} from "lucide-react";

const TYPE_META: Record<
  string,
  { icon: React.ElementType; color: string; sound?: boolean }
> = {
  meeting_request:    { icon: Calendar,      color: "text-primary",       sound: true },
  meeting_rescheduled:{ icon: Calendar,      color: "text-amber-400",     sound: true },
  meeting_accepted:   { icon: Check,         color: "text-emerald-400",   sound: true },
  meeting_declined:   { icon: X,             color: "text-rose-400",      sound: false },
  meeting_cancelled:  { icon: Calendar,      color: "text-muted-foreground", sound: false },
  new_message:        { icon: MessageSquare, color: "text-primary",       sound: true },
  new_match:          { icon: Zap,           color: "text-amber-400",     sound: false },
  company_approved:   { icon: Building2,     color: "text-emerald-400",   sound: true },
  company_live:       { icon: Building2,     color: "text-emerald-400",   sound: false },
  company_rejected:   { icon: Building2,     color: "text-rose-400",      sound: false },
  contact_exchange:   { icon: Zap,           color: "text-primary",       sound: false },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: Bell, color: "text-muted-foreground", sound: false };
}

/**
 * NotificationToast — renders nothing visible itself.
 * Subscribes to realtime notifications for the current user and
 * shows a Sonner toast on each new INSERT.
 */
export function NotificationToast() {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Don't double-subscribe
      if (channelRef.current) return;

      channelRef.current = supabase
        .channel(`notif-toast-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as {
              id: string;
              type: string;
              title: string;
              body: string | null;
              link: string | null;
            };

            const meta = getTypeMeta(n.type);
            const Icon = meta.icon;

            toast.custom(
              (toastId) => (
                <div
                  className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 shadow-lg max-w-sm w-full cursor-pointer"
                  onClick={() => {
                    toast.dismiss(toastId);
                    if (n.link) window.location.href = n.link;
                  }}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {n.body}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); }}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
              {
                duration: 6000,
                position: "top-right",
              }
            );
          }
        )
        .subscribe();
    });

    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return null;
}
