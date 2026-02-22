"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Zap,
  Users,
  MessageSquare,
  Clock,
  Search,
  ArrowLeft,
  LogOut,
  User,
  CalendarDays,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParticipantPerms } from "@/hooks/use-participant-perms";

interface Props {
  eventId: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    platform_role: string | null;
  };
}

export function ParticipantEventSidebar({ eventId, profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [eventName, setEventName] = useState("Event");
  const [unreadCount, setUnreadCount] = useState(0);
  const perms = useParticipantPerms(eventId);

  const basePath = `/dashboard/events/${eventId}`;

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("events")
      .select("name")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data) setEventName(data.name);
      });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .eq("type", "new_message")
        .then(({ count }) => setUnreadCount(count || 0));
    });
  }, [eventId]);

  function isActive(navPath: string) {
    if (navPath === "") return pathname === basePath;
    return pathname.startsWith(basePath + navPath);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-background">
      {/* Event name header */}
      <div className="flex h-14 items-center gap-3 px-5 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
          <CalendarDays className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold truncate flex-1">
          {eventName}
        </span>
      </div>

      {/* Back to events */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href="/dashboard/home"
          className="flex items-center gap-2 rounded-sm px-3 py-2 text-caption text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to events
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {[
          { id: "overview", label: "Dashboard", icon: LayoutDashboard, path: "", show: true },
          { id: "matches", label: "Matches", icon: Zap, path: "/matches", show: true },
          { id: "meetings", label: "Meetings", icon: Users, path: "/meetings", show: perms.can_book_meetings },
          { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages", show: perms.can_message },
          { id: "directory", label: "Directory", icon: Search, path: "/directory", show: perms.can_view_directory },
          { id: "availability", label: "Availability", icon: Clock, path: "/availability", show: perms.can_book_meetings },
        ]
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.id}
                href={basePath + item.path}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-body",
                  "transition-all duration-150 ease-out",
                  active
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
                {item.label}
                {item.id === "messages" && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Profile / Sign out */}
      <div className="border-t border-border p-3">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary transition-colors"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-caption font-medium">{profile.full_name}</p>
            <p className="truncate text-small text-muted-foreground">{profile.email}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-caption text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
