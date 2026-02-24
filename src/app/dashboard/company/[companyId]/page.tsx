"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Eye,
  Download,
  MousePointerClick,
  Calendar,
  Users,
  BarChart3,
  Target,
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

interface Lead {
  id: string;
  source: string;
  qualification: string | null;
  notes: string | null;
  tags: string[];
  resource_accessed: string | null;
  created_at: string;
  participant: any;
}

export default function CompanyDashboardPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "leads">("overview");
  const [editingLead, setEditingLead] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [analyticsRes, leadsRes] = await Promise.all([
      fetch(`/api/companies/${companyId}/analytics?days=30`),
      fetch(`/api/companies/${companyId}/leads`),
    ]);
    const analyticsData = await analyticsRes.json();
    const leadsData = await leadsRes.json();
    setAnalytics(analyticsData);
    setLeads(leadsData.leads || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateLead(leadId: string, updates: Record<string, unknown>) {
    await fetch(`/api/companies/${companyId}/leads`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, ...updates }),
    });
    await loadData();
    setEditingLead(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const t = analytics?.totals || { profile_views: 0, unique_visitors: 0, resource_downloads: 0, meeting_requests_received: 0, leads_captured: 0 };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in p-6">
      <div className="mb-6">
        <h1 className="text-h1 font-semibold tracking-tight">Company Dashboard</h1>
        <p className="text-body text-muted-foreground mt-1">Last 30 days performance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {[
          { key: "overview" as const, label: "Overview", icon: BarChart3 },
          { key: "leads" as const, label: "Leads", icon: Target, count: leads.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-caption font-medium border-b-2 -mb-px transition-all ${
              activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {"count" in tab && tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div>
          {/* Stats cards */}
          <div className="grid gap-3 sm:grid-cols-5 mb-8">
            {[
              { label: "Profile Views", value: t.profile_views, icon: Eye },
              { label: "Unique Visitors", value: t.unique_visitors, icon: Users },
              { label: "Downloads", value: t.resource_downloads, icon: Download },
              { label: "Meeting Requests", value: t.meeting_requests_received, icon: Calendar },
              { label: "Leads", value: t.leads_captured, icon: Target },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-5 pb-5 text-center">
                  <stat.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-h2 font-semibold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Daily chart (simple bar representation) */}
          {analytics?.daily && analytics.daily.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-body font-semibold mb-4">Views Over Time</h3>
                <div className="flex items-end gap-1 h-32">
                  {analytics.daily.map((day) => {
                    const maxViews = Math.max(...analytics.daily.map((d) => d.profile_views), 1);
                    const height = (day.profile_views / maxViews) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.profile_views} views`}>
                        <div
                          className="w-full bg-primary/20 rounded-t hover:bg-primary/40 transition-colors"
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
          )}

          {/* CTA performance */}
          {analytics?.daily && (() => {
            const ctaClicks: Record<string, number> = {};
            analytics.daily.forEach((d) => {
              Object.entries(d.cta_clicks || {}).forEach(([key, val]) => {
                ctaClicks[key] = (ctaClicks[key] || 0) + val;
              });
            });
            const entries = Object.entries(ctaClicks);
            if (!entries.length) return null;
            return (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <h3 className="text-body font-semibold mb-3">CTA Performance</h3>
                  <div className="space-y-2">
                    {entries.sort((a, b) => b[1] - a[1]).map(([label, clicks]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-caption">{label}</span>
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                          <span className="text-caption font-medium">{clicks} clicks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* LEADS TAB */}
      {activeTab === "leads" && (
        <div>
          {leads.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Target className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">No leads captured yet.</p>
                <p className="text-caption text-muted-foreground mt-1">Leads are automatically captured when attendees view your profile or download resources.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => {
                const name = lead.participant?.user?.raw_user_meta_data?.full_name || lead.participant?.user?.email || "Unknown";
                return (
                  <Card key={lead.id} className="group">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                          {name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-body font-medium truncate">{name}</p>
                            {lead.qualification && (
                              <Badge variant={lead.qualification === "hot" ? "destructive" : lead.qualification === "warm" ? "warning" : "secondary"} className="text-[9px]">
                                {lead.qualification}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-caption text-muted-foreground">
                            <span>{lead.source.replace("_", " ")}</span>
                            {lead.resource_accessed && <span>· {lead.resource_accessed}</span>}
                            <span>· {new Date(lead.created_at).toLocaleDateString()}</span>
                          </div>
                          {lead.notes && <p className="text-caption text-muted-foreground mt-1 italic">{lead.notes}</p>}
                          {lead.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {lead.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {["hot", "warm", "cold"].map((q) => (
                            <button
                              key={q}
                              onClick={() => updateLead(lead.id, { qualification: lead.qualification === q ? null : q })}
                              className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                                lead.qualification === q
                                  ? q === "hot" ? "bg-red-500/20 text-red-500" : q === "warm" ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500"
                                  : "bg-muted text-muted-foreground hover:bg-secondary"
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
