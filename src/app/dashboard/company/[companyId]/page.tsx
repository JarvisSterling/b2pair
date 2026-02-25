"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSWRFetch, useSWRMultiFetch } from "@/hooks/use-swr-fetch";
import { useRealtime } from "@/hooks/use-realtime";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  Download,
  Calendar,
  Users,
  BarChart3,
  Target,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  capabilities: string[];
  logo_url: string | null;
  event_id: string;
  event_name?: string;
  event_slug?: string;
  team_limit: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; description: string }> = {
  invited: { label: "Invited", icon: Send, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", description: "Your invite is pending. Complete onboarding to submit for review." },
  onboarding: { label: "Setting Up", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", description: "You're still setting up. Complete all steps and submit for review." },
  submitted: { label: "Under Review", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", description: "Your profile has been submitted and is awaiting organizer review." },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", description: "Your profile has been approved! It will be visible once published." },
  live: { label: "Live", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", description: "Your profile is live and visible to all event attendees." },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", description: "Your profile was not approved. Contact the organizer for details." },
};

export default function CompanyDashboardPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  // Fetch all data with SWR (instant cache + background revalidation)
  const { data: companyJson } = useSWRFetch<{ memberships: any[] }>(`/api/user/companies`);
  const { data: analyticsData, mutate: mutateAnalytics } = useSWRFetch<any>(`/api/companies/${companyId}/analytics?days=30`);
  const { data: membersData } = useSWRFetch<any>(`/api/companies/${companyId}/members`);

  const membership = (companyJson?.memberships || []).find((m: any) => m.company_id === companyId);
  const company: CompanyInfo | null = membership ? {
    id: membership.company_id,
    name: membership.company_name,
    slug: membership.company_slug,
    status: membership.company_status,
    capabilities: membership.capabilities,
    logo_url: membership.company_logo,
    event_id: membership.event_id,
    event_name: membership.event_name,
    event_slug: membership.event_slug,
    team_limit: null,
  } : null;

  const stats = analyticsData?.totals || { profile_views: 0, unique_visitors: 0, resource_downloads: 0, meeting_requests_received: 0, leads_captured: 0, cta_clicks_total: 0 };
  const capabilities = analyticsData?.capabilities || [];
  const memberCount = membersData ? (Array.isArray(membersData) ? membersData.length : (membersData.members || []).length) : 0;
  const loading = !companyJson;

  // Real-time: refresh analytics when company_analytics changes
  useRealtime({
    table: "company_analytics",
    filter: { company_id: companyId },
    onChanged: () => mutateAnalytics(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[company?.status || "submitted"] || STATUS_CONFIG.submitted;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          {company?.logo_url ? (
            <SafeImage src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover border" width={40} height={40} />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              {company?.name?.[0] || "C"}
            </div>
          )}
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">{company?.name || "Company Dashboard"}</h1>
            {company?.event_name && (
              <p className="text-caption text-muted-foreground">{company.event_name}</p>
            )}
          </div>
          <div className="ml-auto flex gap-1.5">
            {company?.capabilities.map((cap) => (
              <Badge key={cap} variant="outline" className="text-[10px] capitalize">{cap}</Badge>
            ))}
          </div>
        </div>

        {/* Status banner */}
        <div className={`flex items-center gap-3 rounded-lg border p-4 ${statusConfig.bg}`}>
          <StatusIcon className={`h-5 w-5 shrink-0 ${statusConfig.color}`} />
          <div className="flex-1">
            <span className={`text-caption font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
            <p className="text-caption text-muted-foreground mt-0.5">{statusConfig.description}</p>
          </div>
          {company?.event_slug && (company.status === "live" || company.status === "approved") && (
            <Link
              href={`/events/${company.event_slug}/sponsors/${company.slug}`}
              className="flex items-center gap-1 text-caption text-primary hover:underline shrink-0"
            >
              View public profile <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Stats overview - ordered by company type */}
      <div className="grid gap-3 sm:grid-cols-5 mb-8">
        {(capabilities.includes("exhibitor") && !capabilities.includes("sponsor")
          ? [
              { label: "Leads", value: stats.leads_captured, icon: Target },
              { label: "Meeting Requests", value: stats.meeting_requests_received, icon: Calendar },
              { label: "Profile Views", value: stats.profile_views, icon: Eye },
              { label: "Downloads", value: stats.resource_downloads, icon: Download },
              { label: "Unique Visitors", value: stats.unique_visitors, icon: Users },
            ]
          : capabilities.includes("sponsor") && !capabilities.includes("exhibitor")
          ? [
              { label: "Profile Views", value: stats.profile_views, icon: Eye },
              { label: "Unique Visitors", value: stats.unique_visitors, icon: Users },
              { label: "CTA Clicks", value: stats.cta_clicks_total, icon: MousePointerClick },
              { label: "Downloads", value: stats.resource_downloads, icon: Download },
              { label: "Leads", value: stats.leads_captured, icon: Target },
            ]
          : [
              { label: "Profile Views", value: stats.profile_views, icon: Eye },
              { label: "Leads", value: stats.leads_captured, icon: Target },
              { label: "CTA Clicks", value: stats.cta_clicks_total, icon: MousePointerClick },
              { label: "Meeting Requests", value: stats.meeting_requests_received, icon: Calendar },
              { label: "Downloads", value: stats.resource_downloads, icon: Download },
            ]
        ).map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-5 text-center">
              <stat.icon className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-h2 font-semibold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={`/dashboard/company/${companyId}/analytics`}>
          <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-body font-semibold group-hover:text-primary transition-colors">Analytics</p>
                  <p className="text-caption text-muted-foreground">Views, downloads, CTAs</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/company/${companyId}/leads`}>
          <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Target className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-body font-semibold group-hover:text-primary transition-colors">Leads</p>
                  <p className="text-caption text-muted-foreground">{stats.leads_captured} captured</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/company/${companyId}/team`}>
          <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-body font-semibold group-hover:text-primary transition-colors">Team</p>
                  <p className="text-caption text-muted-foreground">{memberCount} member{memberCount !== 1 ? "s" : ""}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
