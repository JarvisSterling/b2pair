"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Shield,
  Copy,
  Check,
} from "lucide-react";

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
}

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

interface TeamMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  invite_status: string;
  invite_code: string;
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

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Fetch company info
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name, slug, status, capabilities, logo_url, event_id, events(name, slug)")
      .eq("id", companyId)
      .single();

    if (companyData) {
      setCompany({
        id: companyData.id,
        name: companyData.name,
        slug: companyData.slug,
        status: companyData.status,
        capabilities: companyData.capabilities,
        logo_url: companyData.logo_url,
        event_id: companyData.event_id,
        event_name: (companyData as any).events?.name,
        event_slug: (companyData as any).events?.slug,
      });
    }

    // Fetch members
    const { data: membersData } = await supabase
      .from("company_members")
      .select("id, user_id, name, email, role, invite_status, invite_code")
      .eq("company_id", companyId)
      .order("role", { ascending: true });

    setMembers(membersData || []);

    // Fetch analytics and leads
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
  }

  function copyInviteLink(member: TeamMember) {
    const url = `${window.location.origin}/partners/invite/${member.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const t = analytics?.totals || { profile_views: 0, unique_visitors: 0, resource_downloads: 0, meeting_requests_received: 0, leads_captured: 0 };
  const statusConfig = STATUS_CONFIG[company?.status || "submitted"] || STATUS_CONFIG.submitted;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Header with status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover border" />
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
            <div className="flex items-center gap-2">
              <span className={`text-caption font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
            <p className="text-caption text-muted-foreground mt-0.5">{statusConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Overview section */}
      <section id="overview" className="mb-8">
        <h2 className="text-body font-semibold mb-3">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-5">
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
      </section>

      {/* Analytics section */}
      <section id="analytics" className="mb-8">
        <h2 className="text-body font-semibold mb-3">Analytics</h2>
        {analytics?.daily && analytics.daily.length > 0 ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-caption font-semibold mb-4">Views Over Time (30 days)</h3>
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
                    <h3 className="text-caption font-semibold mb-3">CTA Performance</h3>
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
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground">No analytics data yet.</p>
              <p className="text-caption text-muted-foreground mt-1">Data will appear once your profile is live and receiving views.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Leads section */}
      <section id="leads" className="mb-8">
        <h2 className="text-body font-semibold mb-3">Leads ({leads.length})</h2>
        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
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
                            <Badge variant={lead.qualification === "hot" ? "destructive" : lead.qualification === "warm" ? "default" : "secondary"} className="text-[9px]">
                              {lead.qualification}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-caption text-muted-foreground">
                          <span>{lead.source.replace("_", " ")}</span>
                          {lead.resource_accessed && <span>· {lead.resource_accessed}</span>}
                          <span>· {new Date(lead.created_at).toLocaleDateString()}</span>
                        </div>
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
      </section>

      {/* Team section */}
      <section id="team" className="mb-8">
        <h2 className="text-body font-semibold mb-3">Team ({members.length})</h2>
        {members.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground">No team members yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                      {member.name ? member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-medium truncate">{member.name || member.email}</p>
                        <Badge variant="outline" className="text-[9px] capitalize">{member.role}</Badge>
                      </div>
                      <p className="text-caption text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={member.invite_status === "accepted" ? "default" : "secondary"}
                        className="text-[9px]"
                      >
                        {member.invite_status === "accepted" ? "Active" : "Pending"}
                      </Badge>
                      {member.invite_status !== "accepted" && member.invite_code && (
                        <button
                          onClick={() => copyInviteLink(member)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="Copy invite link"
                        >
                          {copiedId === member.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
