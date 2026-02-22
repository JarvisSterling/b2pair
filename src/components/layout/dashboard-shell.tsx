"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { EventSidebar } from "./event-sidebar";
import { WorkspaceHeader } from "./workspace-header";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  title: string | null;
  platform_role: string | null;
}

interface Props {
  profile: Profile;
  workspaces: { id: string; name: string }[];
  children: React.ReactNode;
}

export function DashboardShell({ profile, workspaces, children }: Props) {
  const pathname = usePathname();
  const isOrganizer = profile.platform_role === "organizer";

  // Determine context from URL
  const workspaceMatch = pathname.match(/\/dashboard\/w\/([^/]+)/);
  const eventMatch = pathname.match(/\/dashboard\/w\/([^/]+)\/events\/([^/]+)/);
  const isNewWorkspace = pathname === "/dashboard/w/new";
  const isEventView = eventMatch && eventMatch[2] !== "new";
  const isWorkspaceRoot = workspaceMatch && !isEventView && !pathname.endsWith("/events/new");
  const isNewEvent = pathname.endsWith("/events/new") && workspaceMatch;

  const currentWorkspaceId = workspaceMatch?.[1];
  const currentEventId = eventMatch?.[2];

  // No sidebar for workspace creation
  if (isNewWorkspace) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  // Organizer inside an event: event sidebar
  if (isOrganizer && isEventView && currentWorkspaceId && currentEventId) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <EventSidebar
          workspaceId={currentWorkspaceId}
          eventId={currentEventId}
          workspaces={workspaces}
          profile={profile}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Organizer at workspace level (event list, new event): workspace header, no sidebar
  if (isOrganizer && (isWorkspaceRoot || isNewEvent)) {
    return (
      <div className="min-h-screen bg-background">
        <WorkspaceHeader
          profile={profile}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
        />
        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    );
  }

  // Participant: full sidebar + header
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header profile={profile} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
