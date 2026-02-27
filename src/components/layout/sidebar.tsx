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
import { SafeImage } from "@/components/ui/safe-image";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  title: string | null;
  platform_role: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard/home", label: "Dashboard", icon: LayoutDashboard, roles: ["participant"] },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays, roles: ["participant"] },
  { href: "/dashboard/matches", label: "Matches", icon: Zap, roles: ["participant"] },
  { href: "/dashboard/meetings", label: "Meetings", icon: Users, roles: ["participant"] },
  { href: "/dashboard/availability", label: "Availability", icon: Clock, roles: ["participant"] },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, roles: ["participant"] },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, roles: ["participant"] },
];

const BOTTOM_ITEMS = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .then(({ count }) => setUnreadCount(count || 0));

      if (profile.platform_role === "organizer") {
        supabase
          .from("organization_members")
          .select("organization_id, organizations!inner(id, name)")
          .eq("user_id", user.id)
          .then(({ data }) => {
            if (data) {
              setWorkspaces(data.map((d: any) => ({ id: d.organizations.id, name: d.organizations.name })));
            }
          });
      }

      channel = supabase
        .channel("sidebar-notifs")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
          setUnreadCount((prev) => prev + 1);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
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
    <aside className="hidden lg:flex w-[240px] flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-foreground">
            <rect width="24" height="24" rx="6" fill="currentColor" />
            <text x="4" y="17" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="700" fontFamily="var(--font-geist-sans)">B2</text>
          </svg>
          <span className="text-[14px] font-semibold">B2Pair</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-px">
        {role === "organizer" ? (
          <>
            <p className="px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Workspaces
            </p>
            {workspaces.map((ws) => {
              const active = pathname.includes(`/w/${ws.id}`);
              return (
                <Link
                  key={ws.id}
                  href={`/dashboard/w/${ws.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px]",
                    "transition-colors duration-100",
                    active
                      ? "bg-surface text-foreground font-medium"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                    active ? "bg-foreground text-background" : "bg-surface border border-border text-muted-foreground"
                  )}>
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  {ws.name}
                </Link>
              );
            })}
            <Link
              href="/dashboard/w/new"
              className="flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] text-muted-foreground hover:bg-surface hover:text-foreground transition-colors duration-100"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-border text-[11px]">
                +
              </div>
              New workspace
            </Link>
          </>
        ) : (
          filteredNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px]",
                  "transition-colors duration-100",
                  active
                    ? "bg-surface text-foreground font-medium"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={active ? 2 : 1.5} />
                {item.label}
                {item.label === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground text-background px-1 text-[10px] font-medium">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-2 py-3 space-y-px">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px]",
                "transition-colors duration-100",
                active
                  ? "bg-surface text-foreground font-medium"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] text-muted-foreground hover:bg-surface hover:text-foreground transition-colors duration-100"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign out
        </button>
      </div>

      {/* Profile */}
      <div className="border-t border-border p-3">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 rounded-md p-2 hover:bg-surface transition-colors duration-100"
        >
          {profile.avatar_url ? (
            <SafeImage 
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-7 w-7 rounded-full object-cover" width={400} height={200} />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-medium">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium">{profile.full_name}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
