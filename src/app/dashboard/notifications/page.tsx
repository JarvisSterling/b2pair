"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Loader2,
  Check,
  Calendar,
  Zap,
  MessageSquare,
  Users,
  Info,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  meeting_request: <Calendar className="h-4 w-4" />,
  meeting_accepted: <Check className="h-4 w-4" />,
  meeting_declined: <Calendar className="h-4 w-4" />,
  meeting_reminder: <Calendar className="h-4 w-4" />,
  meeting_cancelled: <Calendar className="h-4 w-4" />,
  new_match: <Zap className="h-4 w-4" />,
  new_message: <MessageSquare className="h-4 w-4" />,
  event_update: <Info className="h-4 w-4" />,
  registration_approved: <Check className="h-4 w-4" />,
  registration_rejected: <Users className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    // Subscribe to new notifications
    const supabase = createClient();
    let userId: string | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userId = user.id;

      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, []);

  async function loadNotifications() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data);
    setLoading(false);
  }

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" onClick={markAllRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <Bell className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">No notifications yet.</p>
              <p className="mt-1 text-caption text-muted-foreground">
                You will see notifications here when something needs your attention.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification) => {
            const icon = TYPE_ICONS[notification.type] || TYPE_ICONS.system;
            const timeAgo = getTimeAgo(notification.created_at);

            const content = (
              <div
                className={`flex items-start gap-3 rounded-md p-4 transition-colors duration-150 cursor-pointer ${
                  notification.read
                    ? "hover:bg-secondary/50"
                    : "bg-primary/3 hover:bg-primary/5"
                }`}
                onClick={() => !notification.read && markRead(notification.id)}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                  notification.read ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-body truncate ${notification.read ? "" : "font-medium"}`}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {notification.body && (
                    <p className="text-caption text-muted-foreground mt-0.5 truncate">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-small text-muted-foreground mt-1">{timeAgo}</p>
                </div>
              </div>
            );

            if (notification.link) {
              return (
                <Link key={notification.id} href={notification.link}>
                  {content}
                </Link>
              );
            }

            return <div key={notification.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
