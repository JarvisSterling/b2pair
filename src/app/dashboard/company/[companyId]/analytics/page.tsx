"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useSWRFetch } from "@/hooks/use-swr-fetch";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Eye,
  Download,
  Calendar,
  Users,
  BarChart3,
  Target,
  MousePointerClick,
  ArrowLeft,
  TrendingUp,
  Sparkles,
  Percent,
} from "lucide-react";

interface Analytics {
  daily: {
    date: string;
    profile_views: number;
    unique_visitors: number;
    resource_downloads: number;
    cta_clicks: Record<string, number>;
    meeting_requests_received: number;
    leads_captured: number;
  }[];
  totals: {
    profile_views: number;
    unique_visitors: number;
    resource_downloads: number;
    meeting_requests_received: number;
    leads_captured: number;
    cta_clicks_total: number;
  };
  capabilities: string[];
}

interface StatCard {
  label: string;
  value: number | string;
  icon: any;
  color: string;
  bg: string;
}

export default function CompanyAnalyticsPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const { data: analytics, isLoading: loading, mutate } = useSWRFetch<Analytics>(`/api/companies/${companyId}/analytics?days=30`);

  // Real-time: refresh when analytics data changes
  useRealtime({
    table: "company_analytics",
    filter: { company_id: companyId },
    onChanged: () => mutate(),
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const t = analytics?.totals || { profile_views: 0, unique_visitors: 0, resource_downloads: 0, meeting_requests_received: 0, leads_captured: 0, cta_clicks_total: 0 };
  const capabilities = analytics?.capabilities || [];
  const isSponsor = capabilities.includes("sponsor");
  const isExhibitor = capabilities.includes("exhibitor");
  const isBoth = isSponsor && isExhibitor;

  // Compute derived metrics
  const conversionRate = t.unique_visitors > 0 ? ((t.leads_captured / t.unique_visitors) * 100).toFixed(1) : "0.0";
  const visibilityScore = Math.min(100, Math.round(
    (t.profile_views * 1 + t.cta_clicks_total * 5 + t.resource_downloads * 3) / Math.max(1, t.profile_views) * 10
  ));

  // Build stat cards based on type
  function getSponsorStats(): StatCard[] {
    return [
      { label: "Profile Views", value: t.profile_views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Unique Visitors", value: t.unique_visitors, icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
      { label: "CTA Clicks", value: t.cta_clicks_total, icon: MousePointerClick, color: "text-amber-500", bg: "bg-amber-500/10" },
      { label: "Downloads", value: t.resource_downloads, icon: Download, color: "text-green-500", bg: "bg-green-500/10" },
      { label: "Engagement Score", value: visibilityScore, icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
    ];
  }

  function getExhibitorStats(): StatCard[] {
    return [
      { label: "Leads Captured", value: t.leads_captured, icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
      { label: "Meeting Requests", value: t.meeting_requests_received, icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10" },
      { label: "Conversion Rate", value: `${conversionRate}%`, icon: Percent, color: "text-green-500", bg: "bg-green-500/10" },
      { label: "Profile Views", value: t.profile_views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Downloads", value: t.resource_downloads, icon: Download, color: "text-violet-500", bg: "bg-violet-500/10" },
    ];
  }

  const statCards = isBoth
    ? [
        { label: "Profile Views", value: t.profile_views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Leads Captured", value: t.leads_captured, icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "CTA Clicks", value: t.cta_clicks_total, icon: MousePointerClick, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Meeting Requests", value: t.meeting_requests_received, icon: Calendar, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "Conversion Rate", value: `${conversionRate}%`, icon: Percent, color: "text-violet-500", bg: "bg-violet-500/10" },
      ]
    : isExhibitor
    ? getExhibitorStats()
    : getSponsorStats();

  // Aggregate CTA clicks across all days
  const ctaClicks: Record<string, number> = {};
  (analytics?.daily || []).forEach((d) => {
    Object.entries(d.cta_clicks || {}).forEach(([key, val]) => {
      ctaClicks[key] = (ctaClicks[key] || 0) + val;
    });
  });
  const ctaEntries = Object.entries(ctaClicks).sort((a, b) => b[1] - a[1]);

  const hasData = analytics?.daily && analytics.daily.length > 0;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/company/${companyId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Analytics</h1>
          <p className="text-caption text-muted-foreground">Last 30 days performance</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={`grid gap-3 mb-8 ${statCards.length <= 5 ? "sm:grid-cols-5" : "sm:grid-cols-3 lg:grid-cols-6"}`}>
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-h2 font-semibold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasData ? (
        <div className="space-y-4">
          {/* Section: Visibility (sponsors & both) */}
          {(isSponsor || isBoth) && (
            <>
              {isBoth && (
                <h2 className="text-h3 font-semibold mt-2 mb-1">Visibility</h2>
              )}

              {/* Profile views chart */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-body font-semibold">Profile Views Over Time</h3>
                  </div>
                  <BarChart
                    data={analytics!.daily}
                    valueKey="profile_views"
                    color="bg-primary/20"
                    hoverColor="bg-primary/40"
                    labelPrefix="views"
                  />
                </CardContent>
              </Card>

              {/* CTA performance */}
              {ctaEntries.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MousePointerClick className="h-4 w-4 text-amber-500" />
                      <h3 className="text-body font-semibold">CTA Performance</h3>
                    </div>
                    <div className="space-y-3">
                      {ctaEntries.map(([label, clicks]) => {
                        const max = Math.max(...ctaEntries.map(([, v]) => v), 1);
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-caption font-medium">{label}</span>
                              <span className="text-caption text-muted-foreground">{clicks} clicks</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-amber-500/60 transition-all" style={{ width: `${(clicks / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Downloads chart (sponsors care about resource engagement) */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Download className="h-4 w-4 text-green-500" />
                    <h3 className="text-body font-semibold">Resource Downloads</h3>
                  </div>
                  <BarChart
                    data={analytics!.daily}
                    valueKey="resource_downloads"
                    color="bg-green-500/20"
                    hoverColor="bg-green-500/40"
                    labelPrefix="downloads"
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Section: Lead Generation (exhibitors & both) */}
          {(isExhibitor || isBoth) && (
            <>
              {isBoth && (
                <h2 className="text-h3 font-semibold mt-6 mb-1">Lead Generation</h2>
              )}

              {/* Leads over time */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-4 w-4 text-red-500" />
                    <h3 className="text-body font-semibold">Leads Captured Over Time</h3>
                  </div>
                  <BarChart
                    data={analytics!.daily}
                    valueKey="leads_captured"
                    color="bg-red-500/20"
                    hoverColor="bg-red-500/40"
                    labelPrefix="leads"
                  />
                </CardContent>
              </Card>

              {/* Meeting requests over time */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <h3 className="text-body font-semibold">Meeting Requests Over Time</h3>
                  </div>
                  <BarChart
                    data={analytics!.daily}
                    valueKey="meeting_requests_received"
                    color="bg-amber-500/20"
                    hoverColor="bg-amber-500/40"
                    labelPrefix="requests"
                  />
                </CardContent>
              </Card>

              {/* Downloads (exhibitors: resource engagement = lead quality signal) */}
              {!isBoth && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Download className="h-4 w-4 text-green-500" />
                      <h3 className="text-body font-semibold">Resource Downloads</h3>
                    </div>
                    <BarChart
                      data={analytics!.daily}
                      valueKey="resource_downloads"
                      color="bg-green-500/20"
                      hoverColor="bg-green-500/40"
                      labelPrefix="downloads"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No analytics data yet.</p>
            <p className="text-caption text-muted-foreground mt-1">Data will appear once your profile is live and receiving views.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Reusable bar chart component */
function BarChart({
  data,
  valueKey,
  color,
  hoverColor,
  labelPrefix,
}: {
  data: any[];
  valueKey: string;
  color: string;
  hoverColor: string;
  labelPrefix: string;
}) {
  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((day) => {
        const val = day[valueKey] || 0;
        const height = (val / maxVal) * 100;
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1 group"
            title={`${day.date}: ${val} ${labelPrefix}`}
          >
            <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {val}
            </span>
            <div
              className={`w-full ${color} rounded-t hover:${hoverColor} transition-colors cursor-default`}
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            {data.length <= 14 && (
              <span className="text-[8px] text-muted-foreground">{day.date.slice(5)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
