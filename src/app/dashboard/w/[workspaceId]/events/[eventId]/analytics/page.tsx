import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Zap,
  Calendar,
  MessageSquare,
  TrendingUp,
  Star,
  Clock,
  UserCheck,
  UserX,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import { ExportButton } from "./export-button";

interface PageProps {
  params: Promise<{ workspaceId: string; eventId: string }>;
}

export default async function AnalyticsDashboard({ params }: PageProps) {
  const { workspaceId, eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, start_date, end_date")
    .eq("id", eventId)
    .eq("organization_id", workspaceId)
    .single();

  if (!event) notFound();

  // Use admin client for aggregate queries (RLS on matches/meetings/etc.
  // restricts to own records, but organizer needs to see all event data)
  const admin = createAdminClient();

  // --- All queries in parallel ---
  const [
    { count: totalParticipants },
    { count: approvedParticipants },
    { count: pendingParticipants },
    { count: rejectedParticipants },
    { data: typeBreakdown },
    { data: allParticipants },
    { count: totalMatches },
    { count: acceptedMatches },
    { count: savedMatches },
    { count: dismissedMatches },
    { data: matchScores },
    { count: totalMeetings },
    { count: pendingMeetings },
    { count: acceptedMeetings },
    { count: declinedMeetings },
    { count: completedMeetings },
    { count: noShowMeetings },
    { data: ratingData },
    { count: totalConversations },
    { count: totalMessages },
    { data: topParticipants },
  ] = await Promise.all([
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "approved"),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "pending"),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "rejected"),
    admin.from("event_participant_types").select("id, name, color").eq("event_id", eventId).order("sort_order"),
    admin.from("participants").select("role, intent, participant_type_id, status").eq("event_id", eventId).eq("status", "approved"),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "accepted"),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "saved"),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "dismissed"),
    admin.from("matches").select("score").eq("event_id", eventId),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "pending"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "accepted"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "declined"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "completed"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "no_show"),
    admin.from("meetings").select("requester_rating, recipient_rating").eq("event_id", eventId).not("requester_rating", "is", null),
    admin.from("conversations").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("messages").select("*, conversations!inner(event_id)", { count: "exact", head: true }).eq("conversations.event_id", eventId),
    admin.from("matches").select(`score, participant_a:participants!matches_participant_a_id_fkey(profiles!inner(full_name, company_name)), participant_b:participants!matches_participant_b_id_fkey(profiles!inner(full_name, company_name))`).eq("event_id", eventId).order("score", { ascending: false }).limit(5),
  ]);

  // Compute breakdowns from the single allParticipants query
  const approvedList = allParticipants || [];

  const typeCounts = (typeBreakdown || []).map((t: any) => ({
    ...t,
    count: approvedList.filter((p: any) => p.participant_type_id === t.id).length,
  }));

  const roleCounts: Record<string, number> = {};
  approvedList.forEach((p: any) => {
    const role = p.role || "unspecified";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  const intentCounts: Record<string, number> = {};
  approvedList.forEach((p: any) => {
    const intent = p.intent || "unspecified";
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });

  // Match stats
  const avgScore = matchScores?.length
    ? Math.round(matchScores.reduce((sum, m) => sum + m.score, 0) / matchScores.length)
    : 0;

  const topScore = matchScores?.length
    ? Math.round(Math.max(...matchScores.map((m) => m.score)))
    : 0;

  const matchAcceptRate = totalMatches
    ? Math.round(((acceptedMatches || 0) / (totalMatches || 1)) * 100)
    : 0;

  // Meeting stats
  const allRatings = [
    ...(ratingData || []).map((m) => m.requester_rating).filter(Boolean),
    ...(ratingData || []).map((m) => m.recipient_rating).filter(Boolean),
  ] as number[];

  const avgRating = allRatings.length
    ? (allRatings.reduce((s, r) => s + r, 0) / allRatings.length).toFixed(1)
    : "—";

  const meetingAcceptRate = totalMeetings
    ? Math.round(((acceptedMeetings || 0) + (completedMeetings || 0)) / (totalMeetings || 1) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-body text-muted-foreground">{event.name}</p>
        </div>
        <ExportButton eventId={eventId} />
      </div>

      {/* Overview KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 mb-8">
        <KPICard icon={Users} label="Registered" value={totalParticipants || 0} />
        <KPICard icon={UserCheck} label="Approved" value={approvedParticipants || 0} color="text-emerald-600" />
        <KPICard icon={Zap} label="Matches" value={totalMatches || 0} />
        <KPICard icon={TrendingUp} label="Match Rate" value={`${matchAcceptRate}%`} />
        <KPICard icon={Calendar} label="Meetings" value={totalMeetings || 0} />
        <KPICard icon={Star} label="Avg Rating" value={avgRating} color="text-amber-500" />
        <KPICard icon={MessageSquare} label="Messages" value={totalMessages || 0} />
        <KPICard icon={BarChart3} label="Avg Score" value={`${avgScore}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Registration funnel */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-body font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Registration Funnel
            </h2>
            <div className="space-y-3">
              <FunnelBar label="Total Registered" value={totalParticipants || 0} max={totalParticipants || 1} color="bg-primary" />
              <FunnelBar label="Approved" value={approvedParticipants || 0} max={totalParticipants || 1} color="bg-emerald-500" />
              <FunnelBar label="Pending" value={pendingParticipants || 0} max={totalParticipants || 1} color="bg-amber-500" />
              <FunnelBar label="Rejected" value={rejectedParticipants || 0} max={totalParticipants || 1} color="bg-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Match performance */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-body font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Match Performance
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <MiniStat label="Total Matches" value={totalMatches || 0} />
              <MiniStat label="Accepted" value={acceptedMatches || 0} />
              <MiniStat label="Saved" value={savedMatches || 0} />
              <MiniStat label="Dismissed" value={dismissedMatches || 0} />
              <MiniStat label="Avg Score" value={`${avgScore}%`} />
              <MiniStat label="Top Score" value={`${topScore}%`} />
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-caption">
                <span className="text-muted-foreground">Accept rate</span>
                <span className="font-semibold">{matchAcceptRate}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(matchAcceptRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting breakdown */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-body font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Meeting Breakdown
            </h2>
            <div className="space-y-3">
              <FunnelBar label="Total Requests" value={totalMeetings || 0} max={totalMeetings || 1} color="bg-primary" />
              <FunnelBar label="Accepted" value={acceptedMeetings || 0} max={totalMeetings || 1} color="bg-emerald-500" />
              <FunnelBar label="Pending" value={pendingMeetings || 0} max={totalMeetings || 1} color="bg-amber-500" />
              <FunnelBar label="Completed" value={completedMeetings || 0} max={totalMeetings || 1} color="bg-blue-500" />
              <FunnelBar label="Declined" value={declinedMeetings || 0} max={totalMeetings || 1} color="bg-red-500" />
              <FunnelBar label="No-shows" value={noShowMeetings || 0} max={totalMeetings || 1} color="bg-gray-400" />
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between text-caption">
              <span className="text-muted-foreground">Accept rate</span>
              <span className="font-semibold">{meetingAcceptRate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-body font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Engagement
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <MiniStat label="Conversations" value={totalConversations || 0} />
              <MiniStat label="Messages" value={totalMessages || 0} />
              <MiniStat label="Avg Rating" value={avgRating} />
              <MiniStat label="Ratings Given" value={allRatings.length} />
            </div>
            {allRatings.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-caption text-muted-foreground mb-2">Rating distribution</p>
                <div className="flex gap-1 items-end h-12">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const count = allRatings.filter((r) => Math.round(r) === star).length;
                    const pct = allRatings.length ? (count / allRatings.length) * 100 : 0;
                    return (
                      <div key={star} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm bg-amber-400/80 transition-all"
                          style={{ height: `${Math.max(pct, 4)}%`, minHeight: 2 }}
                        />
                        <span className="text-[10px] text-muted-foreground">{star}★</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Participant breakdown sections */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* By type */}
        {typeCounts.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-body font-semibold mb-4">By Type</h2>
              <div className="space-y-2.5">
                {typeCounts.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-caption">{t.name}</span>
                    </div>
                    <span className="text-caption font-semibold">{t.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* By role */}
        {Object.keys(roleCounts).length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-body font-semibold mb-4">By Role</h2>
              <div className="space-y-2.5">
                {Object.entries(roleCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-caption capitalize">{role}</span>
                      <span className="text-caption font-semibold">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* By intent */}
        {Object.keys(intentCounts).length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-body font-semibold mb-4">By Intent</h2>
              <div className="space-y-2.5">
                {Object.entries(intentCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([intent, count]) => (
                    <div key={intent} className="flex items-center justify-between">
                      <span className="text-caption capitalize">{intent}</span>
                      <span className="text-caption font-semibold">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top matches */}
      {topParticipants && topParticipants.length > 0 && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-body font-semibold mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              Top Matches
            </h2>
            <div className="space-y-2">
              {topParticipants.map((m: any, i: number) => {
                const a = m.participant_a?.profiles;
                const b = m.participant_b?.profiles;
                if (!a || !b) return null;
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 text-caption">
                      <span className="font-medium">{a.full_name}</span>
                      <span className="text-muted-foreground">×</span>
                      <span className="font-medium">{b.full_name}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {Math.round(m.score)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 text-center">
        <Icon className={`h-4 w-4 mx-auto mb-1.5 ${color || "text-muted-foreground"}`} />
        <p className={`text-h3 font-semibold ${color || ""}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-caption text-muted-foreground">{label}</span>
        <span className="text-caption font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center p-2 rounded-md bg-muted/50">
      <p className="text-h3 font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
