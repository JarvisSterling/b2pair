"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  Zap,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["organizer", "participant"] },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays, roles: ["organizer", "participant"] },
  { href: "/dashboard/matches", label: "Matches", icon: Zap, roles: ["participant"] },
  { href: "/dashboard/meetings", label: "Meetings", icon: Users, roles: ["participant"] },
  { href: "/dashboard/availability", label: "Availability", icon: Clock, roles: ["participant"] },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, roles: ["participant"] },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, roles: ["organizer", "participant"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["organizer", "participant"] },
];

export function Header({ profile }: { profile: Profile }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const role = profile.platform_role || "participant";
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  useEffect(() => {
    const supabase = createClient();

    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      setUnreadCount(count || 0);
    }

    fetchUnread();

    // Subscribe to new notifications for live badge updates
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel("header-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnread();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
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

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 lg:justify-end">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile logo */}
        <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-small font-bold">
            B2
          </div>
          <span className="text-h3 font-semibold">B2Pair</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          <Link href="/dashboard/settings" className="hidden lg:block">
            {profile.avatar_url ? (
              <SafeImage src={profile.avatar_url} alt={profile.full_name} className="h-8 w-8 rounded-full object-cover" width={32} height={32} />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium">
                {initials}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border shadow-elevated animate-slide-right lg:hidden">
            <div className="flex h-16 items-center justify-between px-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-small font-bold">
                  B2
                </div>
                <span className="text-h3 font-semibold">B2Pair</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="px-3 py-4 space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-sm px-3 py-2.5 text-body",
                      "transition-all duration-150",
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
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                {profile.avatar_url ? (
                  <SafeImage src={profile.avatar_url} alt={profile.full_name} className="h-9 w-9 rounded-full object-cover" width={400} height={200} />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-body font-medium">{profile.full_name}</p>
                  <p className="truncate text-caption text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-body text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
