"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  Zap,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  title: string | null;
  platform_role: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["organizer", "participant"] },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays, roles: ["organizer", "participant"] },
  { href: "/dashboard/matches", label: "Matches", icon: Zap, roles: ["participant"] },
  { href: "/dashboard/meetings", label: "Meetings", icon: Users, roles: ["participant"] },
  { href: "/dashboard/availability", label: "Availability", icon: Clock, roles: ["participant"] },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, roles: ["participant"] },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, roles: ["organizer", "participant"] },
];

const BOTTOM_ITEMS = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Initial count
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .then(({ count }) => setUnreadCount(count || 0));

      // Real-time updates
      channel = supabase
        .channel("sidebar-notifs")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
          setUnreadCount((prev) => prev + 1);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
          // Re-fetch on update (mark read)
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false)
            .then(({ count }) => setUnreadCount(count || 0));
        })
        .subscribe();
    });

    return () => { if (channel) createClient().removeChannel(channel); };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const role = profile.platform_role || "participant";
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-small font-bold">
            B2
          </div>
          <span className="text-h3 font-semibold tracking-tight">B2Pair</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
              {item.label === "Notifications" && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
            </Link>
          );
        })}

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-body text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 ease-out"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
          Sign out
        </button>
      </div>

      {/* Profile */}
      <div className="border-t border-border p-4">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 rounded-sm p-2 hover:bg-secondary transition-colors duration-150"
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-body font-medium">{profile.full_name}</p>
            <p className="truncate text-caption text-muted-foreground">
              {profile.title || profile.email}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
