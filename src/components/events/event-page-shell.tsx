"use client";

import { useState } from "react";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterButton } from "@/components/events/register-button";
import { EventThemeProvider } from "@/components/events/theme-provider";
import { BlockRenderer } from "@/components/events/block-renderer";
import type { EventPage, EventTheme, ContentBlock, ThemeKey } from "@/types/event-pages";
import { cn } from "@/lib/utils";

interface EventPageShellProps {
  event: any;
  pages: EventPage[];
  theme: EventTheme | null;
  activeTab: string;
  participantTypes: any[];
  participantCount: number;
  isRegistered: boolean;
  isLoggedIn: boolean;
}

export function EventPageShell({
  event,
  pages,
  theme,
  activeTab,
  participantTypes,
  participantCount,
  isRegistered,
  isLoggedIn,
}: EventPageShellProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const currentPage = pages.find((p) => p.slug === currentTab) || pages[0];
  const themeKey = (theme?.theme_key as ThemeKey) || "light-classic";
  const isHome = currentPage?.page_type === "home";

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const location =
    event.format === "virtual"
      ? "Virtual Event"
      : [event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "TBD";

  return (
    <EventThemeProvider themeKey={themeKey} accentColor={theme?.accent_color}>
      {/* Hero (always shown, uses banner from events table) */}
      {isHome && (
        <div
          className="relative"
          style={
            event.banner_url
              ? {
                  backgroundImage: `url(${event.banner_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, var(--page-surface), var(--page-bg))`,
                }
          }
        >
          {event.banner_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
          <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
            {event.logo_url && (
              <div className="mb-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.logo_url}
                  alt={`${event.name} logo`}
                  className="h-16 w-16 rounded-2xl object-contain bg-white/10 p-2"
                />
              </div>
            )}
            <Badge
              className="mb-4"
              style={{
                backgroundColor: event.banner_url ? "rgba(255,255,255,0.1)" : "var(--page-surface)",
                color: event.banner_url ? "#fff" : "var(--page-text-secondary)",
                borderColor: event.banner_url ? "rgba(255,255,255,0.2)" : "var(--page-border)",
              }}
            >
              {event.event_type}
            </Badge>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{
                color: event.banner_url ? "#fff" : "var(--page-text)",
                fontFamily: "var(--page-font-heading)",
              }}
            >
              {event.name}
            </h1>
            {event.description && (
              <p
                className="text-lg max-w-2xl mx-auto mb-8"
                style={{ color: event.banner_url ? "rgba(255,255,255,0.8)" : "var(--page-text-secondary)" }}
              >
                {event.description}
              </p>
            )}

            <div
              className="flex flex-wrap items-center justify-center gap-6 text-sm mb-8"
              style={{ color: event.banner_url ? "rgba(255,255,255,0.7)" : "var(--page-text-secondary)" }}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {dateFormatter.format(startDate)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
              {participantCount > 0 && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {participantCount} participants
                </span>
              )}
            </div>

            <RegisterButton
              eventId={event.id}
              eventSlug={event.slug}
              isRegistered={isRegistered}
              isLoggedIn={isLoggedIn}
              requiresApproval={event.requires_approval}
              participantTypes={participantTypes}
            />
          </div>
        </div>
      )}

      {/* Tab navigation */}
      {pages.length > 1 && (
        <div
          className="sticky top-0 z-10"
          style={{
            backgroundColor: "var(--page-bg)",
            borderBottom: "1px solid var(--page-border)",
          }}
        >
          <div className="max-w-4xl mx-auto px-6">
            <nav className="flex gap-1 overflow-x-auto py-2 -mb-px">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentTab(page.slug)}
                  className={cn(
                    "px-4 py-2.5 text-sm rounded-lg whitespace-nowrap transition-all duration-150",
                    page.slug === currentTab
                      ? "font-medium"
                      : "hover:opacity-80"
                  )}
                  style={
                    page.slug === currentTab
                      ? {
                          backgroundColor: "var(--page-surface)",
                          color: "var(--page-text)",
                        }
                      : { color: "var(--page-text-secondary)" }
                  }
                >
                  {page.title}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Event details cards on Home tab */}
        {isHome && (
          <div className="grid gap-4 sm:grid-cols-3 mb-12">
            <Card style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)" }}>
              <CardContent className="pt-6 flex items-start gap-3">
                <Calendar className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--page-text-secondary)" }} />
                <div>
                  <p className="text-caption font-medium" style={{ color: "var(--page-text)" }}>
                    Date & Time
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--page-text-secondary)" }}>
                    {dateFormatter.format(startDate)}
                  </p>
                  <p className="text-sm" style={{ color: "var(--page-text-secondary)" }}>
                    to {dateFormatter.format(endDate)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)" }}>
              <CardContent className="pt-6 flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--page-text-secondary)" }} />
                <div>
                  <p className="text-caption font-medium" style={{ color: "var(--page-text)" }}>
                    Location
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--page-text-secondary)" }}>
                    {location}
                  </p>
                  {event.format === "hybrid" && (
                    <p className="text-sm" style={{ color: "var(--page-text-secondary)" }}>
                      + Virtual attendance
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)" }}>
              <CardContent className="pt-6 flex items-start gap-3">
                <Clock className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--page-text-secondary)" }} />
                <div>
                  <p className="text-caption font-medium" style={{ color: "var(--page-text)" }}>
                    Meetings
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--page-text-secondary)" }}>
                    {event.meeting_duration_minutes} min sessions
                  </p>
                  <p className="text-sm" style={{ color: "var(--page-text-secondary)" }}>
                    AI-powered matchmaking
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Render page blocks */}
        {currentPage && currentPage.content.length > 0 && (
          <BlockRenderer blocks={currentPage.content as ContentBlock[]} />
        )}

        {/* Participant types on Home tab */}
        {isHome && participantTypes.length > 0 && (
          <div className="mt-12">
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: "var(--page-text)", fontFamily: "var(--page-font-heading)" }}
            >
              Who should attend?
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {participantTypes.map((pt: any) => (
                <Card
                  key={pt.id}
                  style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)" }}
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: pt.color }}
                      />
                      <h3
                        className="text-body font-semibold"
                        style={{ color: "var(--page-text)" }}
                      >
                        {pt.name}
                      </h3>
                    </div>
                    {pt.description && (
                      <p className="text-caption" style={{ color: "var(--page-text-secondary)" }}>
                        {pt.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid var(--page-border)` }}>
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-caption" style={{ color: "var(--page-text-secondary)" }}>
            Powered by{" "}
            <span className="font-semibold" style={{ color: "var(--page-text)" }}>
              B2Pair
            </span>
          </p>
        </div>
      </div>
    </EventThemeProvider>
  );
}
