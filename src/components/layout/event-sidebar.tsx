"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Settings2,
  FileEdit,
  Users,
  Zap,
  BarChart3,
  UserCog,
  Calendar,
  QrCode,
  ArrowLeft,
  LogOut,
  ChevronDown,
  Building2,
  Menu,
  X,
  Bell,
  BadgeCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";

interface Props {
  workspaceId: string;
  eventId: string;
  workspaces: { id: string; name: string }[];
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    platform_role: string | null;
  };
}

const EVENT_NAV = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, path: "" },
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
  { id: "agenda", label: "Agenda", icon: Calendar, path: "/agenda" },
  { id: "configure", label: "Configure", icon: Settings2, path: "/configure" },
  { id: "page-editor", label: "Page Editor", icon: FileEdit, path: "/page-editor", absolute: true },
  { id: "participants", label: "Participants", icon: Users, path: "/participants" },
  { id: "participant-types", label: "Participant Types", icon: UserCog, path: "/participant-types" },
  { id: "matching", label: "Matching Rules", icon: Zap, path: "/matching" },
  { id: "partners", label: "Partners", icon: Building2, path: "/partners" },
  { id: "check-in", label: "Check-in", icon: QrCode, path: "/check-in" },
  { id: "badges",   label: "Badges",   icon: BadgeCheck, path: "/check-in/badges" },
];

export function EventSidebar({ workspaceId, eventId, workspaces, profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [allUnreadCount, setAllUnreadCount] = useState(0);

  const basePath = `/dashboard/w/${workspaceId}/events/${eventId}`;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const loadUnread = () => {
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false)
          .then(({ count }) => setAllUnreadCount(count || 0));
      };
      loadUnread();
      const channel = supabase
        .channel("organizer-notifs")
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, loadUnread)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    });
  }, []);
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);

  function isActive(navPath: string) {
    if (navPath === "") return pathname === basePath;
    return pathname === basePath + navPath;
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

  return (<>
    <aside className="hidden lg:flex w-64 flex-col border-r border-emerald-800 bg-[#011a14]">
      {/* Workspace switcher */}
      <div className="relative">
        <button
          onClick={() => setShowWorkspaces(!showWorkspaces)}
          className="flex h-14 w-full items-center gap-3 px-5 border-b border-border hover:bg-secondary/50 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
            {currentWorkspace?.name.charAt(0).toUpperCase() || "W"}
          </div>
          <span className="text-sm font-semibold truncate flex-1 text-left">
            {currentWorkspace?.name || "Workspace"}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showWorkspaces ? "rotate-180" : ""}`} />
        </button>

        {showWorkspaces && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaces(false)} />
            <div className="absolute top-14 left-0 right-0 z-50 bg-background border-b border-border shadow-lg">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/dashboard/w/${ws.id}`}
                  onClick={() => setShowWorkspaces(false)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                    ws.id === workspaceId ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  {ws.name}
                </Link>
              ))}
              <Link
                href="/dashboard/w/new"
                onClick={() => setShowWorkspaces(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-muted-foreground hover:bg-secondary"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded border border-dashed border-muted-foreground/40 text-xs">+</div>
                New workspace
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Back to workspace */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href={`/dashboard/w/${workspaceId}`}
          className="flex items-center gap-2 rounded-sm px-3 py-2 text-caption text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to events
        </Link>
      </div>

      {/* Event navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {EVENT_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const href = (item as any).absolute ? `/editor/${eventId}` : basePath + item.path;

          return (
            <Link
              key={item.id}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-body",
                "transition-all duration-150 ease-out",
                active
                  ? "bg-emerald-950/80 border border-emerald-800 text-primary font-medium"
                  : "text-muted-foreground hover:bg-emerald-950/60 hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard/notifications"
          className={cn(
            "flex items-center gap-3 rounded-sm px-3 py-2.5 text-body",
            "transition-all duration-150 ease-out",
            pathname === "/dashboard/notifications"
              ? "bg-emerald-950/80 border border-emerald-800 text-primary font-medium"
              : "text-muted-foreground hover:bg-emerald-950/60 hover:text-foreground"
          )}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={pathname === "/dashboard/notifications" ? 2 : 1.5} />
          Notifications
          {allUnreadCount > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {allUnreadCount > 99 ? "99+" : allUnreadCount}
            </span>
          )}
        </Link>
      </nav>

      {/* Profile / Sign out */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          {profile.avatar_url ? (
            <SafeImage src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" width={32} height={32} />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-caption font-medium">{profile.full_name}</p>
            <p className="truncate text-small text-muted-foreground">{profile.email}</p>
          </div>
        </div>
        <ThemeToggle variant="row" />
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-caption text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>

    {/* ===== MOBILE HEADER ===== */}
    <div className="fixed top-0 inset-x-0 z-30 flex lg:hidden h-14 items-center gap-3 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
      <button onClick={() => setMenuOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary transition-colors">
        <Menu className="h-5 w-5" />
      </button>
      <span className="flex-1 text-sm font-semibold truncate">{currentWorkspace?.name || "Event"}</span>
      <Link href="/dashboard/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary transition-colors">
        <Bell className="h-5 w-5" />
        {allUnreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">
            {allUnreadCount > 9 ? "9+" : allUnreadCount}
          </span>
        )}
      </Link>
      <ThemeToggle variant="icon" />
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium">{initials}</div>
    </div>

    {/* ===== MOBILE DRAWER ===== */}
    {menuOpen && (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMenuOpen(false)} />
        <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#011a14] border-r border-emerald-800 flex flex-col overflow-y-auto lg:hidden">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
            <span className="text-sm font-semibold">{currentWorkspace?.name}</span>
            <button onClick={() => setMenuOpen(false)} className="p-1.5 hover:bg-secondary rounded-md">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-3 pt-3 pb-1">
            <Link href={`/dashboard/w/${workspaceId}`} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-caption text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <ArrowLeft className="h-3.5 w-3.5" />Back to events
            </Link>
          </div>
          <nav className="flex-1 px-3 py-2 space-y-0.5">
            {EVENT_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const href = (item as any).absolute ? `/editor/${eventId}` : basePath + item.path;
              return (
                <Link key={item.id} href={href} onClick={() => setMenuOpen(false)}
                  className={cn("flex items-center gap-3 rounded-sm px-3 py-2.5 text-body transition-all",
                    active ? "bg-emerald-950/80 border border-emerald-800 text-primary font-medium" : "text-muted-foreground hover:bg-emerald-950/60 hover:text-foreground"
                  )}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
                  {item.label}
                </Link>
              );
            })}
            <Link href="/dashboard/notifications" onClick={() => setMenuOpen(false)}
              className={cn("flex items-center gap-3 rounded-sm px-3 py-2.5 text-body transition-all",
                pathname === "/dashboard/notifications"
                  ? "bg-emerald-950/80 border border-emerald-800 text-primary font-medium"
                  : "text-muted-foreground hover:bg-emerald-950/60 hover:text-foreground"
              )}>
              <Bell className="h-[18px] w-[18px]" strokeWidth={pathname === "/dashboard/notifications" ? 2 : 1.5} />
              Notifications
              {allUnreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {allUnreadCount > 99 ? "99+" : allUnreadCount}
                </span>
              )}
            </Link>
          </nav>
          <div className="border-t border-border p-3 shrink-0">
            <ThemeToggle variant="row" />
            <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-caption text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
              <LogOut className="h-4 w-4" />Sign out
            </button>
          </div>
        </aside>
      </>
    )}

    {/* ===== MOBILE BOTTOM NAV ===== */}
    <nav className="fixed bottom-0 inset-x-0 z-30 flex lg:hidden h-16 items-center justify-around bg-background border-t border-border px-1">
      {[
        { id: "overview", label: "Dashboard", icon: LayoutDashboard, path: "" },
        { id: "participants", label: "People", icon: Users, path: "/participants" },
        { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
        { id: "partners", label: "Partners", icon: Building2, path: "/partners" },
      ].map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link key={item.id} href={basePath + item.path}
            className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-[48px]",
              active ? "text-primary" : "text-muted-foreground"
            )}>
            <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
            <span className="text-[10px] leading-tight">{item.label}</span>
          </Link>
        );
      })}
      <button onClick={() => setMenuOpen(true)}
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-muted-foreground min-w-[48px]">
        <Menu className="h-5 w-5" strokeWidth={1.5} />
        <span className="text-[10px] leading-tight">More</span>
      </button>
    </nav>
  </>);
}
