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
  ArrowLeft,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import { useState } from "react";

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
  { id: "configure", label: "Configure", icon: Settings2, path: "/configure" },
  { id: "page-editor", label: "Page Editor", icon: FileEdit, path: "/page-editor", absolute: true },
  { id: "participants", label: "Participants", icon: Users, path: "/participants" },
  { id: "participant-types", label: "Participant Types", icon: UserCog, path: "/participant-types" },
  { id: "matching", label: "Matching Rules", icon: Zap, path: "/matching" },
];

export function EventSidebar({ workspaceId, eventId, workspaces, profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [showWorkspaces, setShowWorkspaces] = useState(false);

  const basePath = `/dashboard/w/${workspaceId}/events/${eventId}`;
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

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-background">
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

      {/* Profile / Sign out */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-3 py-2">
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
        </div>
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
