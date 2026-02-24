"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  };
}

export default function CompanyAnalyticsPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}/analytics?days=30`);
    const data = await res.json();
    setAnalytics(data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const t = analytics?.totals || { profile_views: 0, unique_visitors: 0, resource_downloads: 0, meeting_requests_received: 0, leads_captured: 0 };

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

      {/* Stats cards */}
      <div className="grid gap-3 sm:grid-cols-5 mb-8">
        {[
          { label: "Profile Views", value: t.profile_views, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Unique Visitors", value: t.unique_visitors, icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Downloads", value: t.resource_downloads, icon: Download, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Meeting Requests", value: t.meeting_requests_received, icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Leads", value: t.leads_captured, icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
        ].map((stat) => (
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

      {/* Views chart */}
      {analytics?.daily && analytics.daily.length > 0 ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-body font-semibold">Profile Views Over Time</h3>
              </div>
              <div className="flex items-end gap-1 h-40">
                {analytics.daily.map((day) => {
                  const maxViews = Math.max(...analytics.daily.map((d) => d.profile_views), 1);
                  const height = (day.profile_views / maxViews) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${day.date}: ${day.profile_views} views`}>
                      <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{day.profile_views}</span>
                      <div
                        className="w-full bg-primary/20 rounded-t hover:bg-primary/40 transition-colors cursor-default"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      {analytics.daily.length <= 14 && (
                        <span className="text-[8px] text-muted-foreground">{day.date.slice(5)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Downloads chart */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="h-4 w-4 text-green-500" />
                <h3 className="text-body font-semibold">Resource Downloads</h3>
              </div>
              <div className="flex items-end gap-1 h-32">
                {analytics.daily.map((day) => {
                  const maxDl = Math.max(...analytics.daily.map((d) => d.resource_downloads), 1);
                  const height = (day.resource_downloads / maxDl) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${day.date}: ${day.resource_downloads} downloads`}>
                      <div
                        className="w-full bg-green-500/20 rounded-t hover:bg-green-500/40 transition-colors cursor-default"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CTA performance */}
          {(() => {
            const ctaClicks: Record<string, number> = {};
            analytics.daily.forEach((d) => {
              Object.entries(d.cta_clicks || {}).forEach(([key, val]) => {
                ctaClicks[key] = (ctaClicks[key] || 0) + val;
              });
            });
            const entries = Object.entries(ctaClicks);
            if (!entries.length) return null;
            return (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MousePointerClick className="h-4 w-4 text-primary" />
                    <h3 className="text-body font-semibold">CTA Performance</h3>
                  </div>
                  <div className="space-y-3">
                    {entries.sort((a, b) => b[1] - a[1]).map(([label, clicks]) => {
                      const max = Math.max(...entries.map(([, v]) => v), 1);
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-caption font-medium">{label}</span>
                            <span className="text-caption text-muted-foreground">{clicks} clicks</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${(clicks / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
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
