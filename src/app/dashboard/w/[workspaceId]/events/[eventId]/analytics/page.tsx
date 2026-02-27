"use client";

import { use } from "react";
import useSWR from "swr";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AnalyticsDashboard({ params }: PageProps) {
  const { workspaceId, eventId } = use(params);
  const { data, isLoading } = useSWR(`/api/events/${eventId}/analytics`, fetcher);

  if (isLoading || !data?.event) {
    return <AnalyticsSkeleton />;
  }

  const { event, participants: p, matches: m, meetings: mt, engagement, typeCounts, roleCounts, intentCounts, topParticipants } = data;

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
        <KPICard icon={Users} label="Registered" value={p.total} />
        <KPICard icon={UserCheck} label="Approved" value={p.approved} color="text-emerald-600" />
        <KPICard icon={Zap} label="Matches" value={m.total} />
        <KPICard icon={TrendingUp} label="Match Rate" value={`${m.acceptRate}%`} />
        <KPICard icon={Calendar} label="Meetings" value={mt.total} />
        <KPICard icon={Star} label="Avg Rating" value={mt.avgRating} color="text-amber-500" />
        <KPICard icon={MessageSquare} label="Messages" value={engagement.messages} />
        <KPICard icon={BarChart3} label="Avg Score" value={`${m.avgScore}%`} />
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
              <FunnelBar label="Total Registered" value={p.total} max={p.total || 1} color="bg-primary" />
              <FunnelBar label="Approved" value={p.approved} max={p.total || 1} color="bg-emerald-500" />
              <FunnelBar label="Pending" value={p.pending} max={p.total || 1} color="bg-amber-500" />
              <FunnelBar label="Rejected" value={p.rejected} max={p.total || 1} color="bg-red-500" />
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
              <MiniStat label="Total Matches" value={m.total} />
              <MiniStat label="Accepted" value={m.accepted} />
              <MiniStat label="Saved" value={m.saved} />
              <MiniStat label="Dismissed" value={m.dismissed} />
              <MiniStat label="Avg Score" value={`${m.avgScore}%`} />
              <MiniStat label="Top Score" value={`${m.topScore}%`} />
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-caption">
                <span className="text-muted-foreground">Accept rate</span>
                <span className="font-semibold">{m.acceptRate}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(m.acceptRate, 100)}%` }} />
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
              <FunnelBar label="Total Requests" value={mt.total} max={mt.total || 1} color="bg-primary" />
              <FunnelBar label="Accepted" value={mt.accepted} max={mt.total || 1} color="bg-emerald-500" />
              <FunnelBar label="Pending" value={mt.pending} max={mt.total || 1} color="bg-amber-500" />
              <FunnelBar label="Completed" value={mt.completed} max={mt.total || 1} color="bg-blue-500" />
              <FunnelBar label="Declined" value={mt.declined} max={mt.total || 1} color="bg-red-500" />
              <FunnelBar label="No-shows" value={mt.noShow} max={mt.total || 1} color="bg-gray-400" />
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between text-caption">
              <span className="text-muted-foreground">Accept rate</span>
              <span className="font-semibold">{mt.acceptRate}%</span>
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
              <MiniStat label="Conversations" value={engagement.conversations} />
              <MiniStat label="Messages" value={engagement.messages} />
              <MiniStat label="Avg Rating" value={mt.avgRating} />
              <MiniStat label="Ratings Given" value={mt.allRatings.length} />
            </div>
            {mt.allRatings.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-caption text-muted-foreground mb-2">Rating distribution</p>
                <div className="flex gap-1 items-end h-12">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const count = mt.allRatings.filter((r: number) => Math.round(r) === star).length;
                    const pct = mt.allRatings.length ? (count / mt.allRatings.length) * 100 : 0;
                    return (
                      <div key={star} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-sm bg-amber-400/80 transition-all" style={{ height: `${Math.max(pct, 4)}%`, minHeight: 2 }} />
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

        {Object.keys(roleCounts).length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-body font-semibold mb-4">By Role</h2>
              <div className="space-y-2.5">
                {Object.entries(roleCounts).sort(([, a]: any, [, b]: any) => b - a).map(([role, count]: any) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-caption capitalize">{role}</span>
                    <span className="text-caption font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {Object.keys(intentCounts).length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-body font-semibold mb-4">By Intent</h2>
              <div className="space-y-2.5">
                {Object.entries(intentCounts).sort(([, a]: any, [, b]: any) => b - a).map(([intent, count]: any) => (
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
      {topParticipants.length > 0 && (
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
                    <Badge variant="secondary" className="font-mono text-xs">{Math.round(m.score)}%</Badge>
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

function AnalyticsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-32 rounded bg-surface mb-2" />
          <div className="h-4 w-48 rounded bg-surface" />
        </div>
        <div className="h-9 w-24 rounded bg-surface" />
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 mb-8">
        {[...Array(8)].map((_, i) => (
          <Card key={i}><CardContent className="pt-4 pb-4 text-center"><div className="h-4 w-4 rounded bg-surface mx-auto mb-2" /><div className="h-5 w-8 rounded bg-surface mx-auto mb-1" /><div className="h-3 w-14 rounded bg-surface mx-auto" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><div className="h-5 w-40 rounded bg-surface mb-4" /><div className="space-y-3">{[...Array(4)].map((_, j) => (<div key={j} className="h-6 rounded bg-surface" />))}</div></CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <Card><CardContent className="pt-4 pb-4 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1.5 ${color || "text-muted-foreground"}`} />
      <p className={`text-h3 font-semibold ${color || ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </CardContent></Card>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-caption text-muted-foreground">{label}</span>
        <span className="text-caption font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }} />
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
