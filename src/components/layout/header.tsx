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

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const channel = supabase
        .channel("header-notifications")
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchUnread())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
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
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:justify-end">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-foreground">
            <rect width="24" height="24" rx="6" fill="currentColor" />
            <text x="4" y="17" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="700" fontFamily="var(--font-geist-sans)">B2</text>
          </svg>
          <span className="text-[14px] font-semibold">B2Pair</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-md">
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-foreground text-background px-0.5 text-[9px] font-medium">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          <Link href="/dashboard/settings" className="hidden lg:block">
            {profile.avatar_url ? (
              <SafeImage src={profile.avatar_url} alt={profile.full_name} className="h-7 w-7 rounded-full object-cover" width={32} height={32} />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-medium">
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
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r border-border shadow-elevated animate-slide-right lg:hidden">
            <div className="flex h-14 items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-foreground">
                  <rect width="24" height="24" rx="6" fill="currentColor" />
                  <text x="4" y="17" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="700" fontFamily="var(--font-geist-sans)">B2</text>
                </svg>
                <span className="text-[14px] font-semibold">B2Pair</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="px-2 py-3 space-y-px">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
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
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
              <div className="flex items-center gap-2.5 mb-2 px-2">
                {profile.avatar_url ? (
                  <SafeImage src={profile.avatar_url} alt={profile.full_name} className="h-7 w-7 rounded-full object-cover" width={400} height={200} />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-medium">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium">{profile.full_name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] text-muted-foreground hover:bg-surface hover:text-foreground transition-colors duration-100"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
