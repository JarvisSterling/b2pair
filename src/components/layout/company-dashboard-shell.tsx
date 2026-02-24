"use client";

import { ParticipantEventSidebar } from "./participant-event-sidebar";

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
  eventId: string;
  companyId: string;
  children: React.ReactNode;
}

/**
 * Shell for company dashboard pages. Renders the participant event sidebar
 * (which includes the mode switcher) alongside the company dashboard content.
 */
export function CompanyDashboardShell({ profile, eventId, companyId, children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ParticipantEventSidebar
        eventId={eventId}
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
