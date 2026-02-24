"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Users,
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Send,
  Shield,
  Crown,
  UserPlus,
  AlertCircle,
} from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin", desc: "Full access to everything", icon: Crown },
  { value: "manager", label: "Manager", desc: "Edit profile, view leads & analytics", icon: Shield },
  { value: "representative", label: "Representative", desc: "View leads, capture leads, chat", icon: Users },
  { value: "scanner", label: "Scanner", desc: "QR scanning and lead capture only", icon: Users },
  { value: "speaker", label: "Speaker", desc: "View sessions and chat", icon: Users },
];

interface TeamMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  invite_status: string;
  invite_code: string;
  created_at: string;
}

export default function CompanyTeamPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [seatLimit, setSeatLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "representative" });

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}/members`);
    const data = await res.json();
    setMembers(data.members || []);
    setSeatLimit(data.seat_limit || 5);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function inviteMember() {
    if (!inviteForm.name || !inviteForm.email) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/companies/${companyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to invite member");
      setSaving(false);
      return;
    }

    await loadData();
    setInviteForm({ name: "", email: "", role: "representative" });
    setShowInvite(false);
    setSaving(false);
  }

  async function removeMember(memberId: string) {
    setDeleting(memberId);
    await fetch(`/api/companies/${companyId}/members?id=${memberId}`, { method: "DELETE" });
    await loadData();
    setDeleting(null);
  }

  function copyInviteLink(member: TeamMember) {
    const url = `${window.location.origin}/partners/invite/${member.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeMembers = members.filter((m) => m.invite_status !== "expired");
  const seatsUsed = activeMembers.length;
  const atLimit = seatsUsed >= seatLimit;
  const seatPercent = Math.min((seatsUsed / seatLimit) * 100, 100);

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/company/${companyId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-h1 font-semibold tracking-tight">Team</h1>
          <p className="text-caption text-muted-foreground">Manage your team members and invitations</p>
        </div>
        {!atLimit && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Seat usage */}
      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-medium">Team seats</span>
            <span className={`text-caption font-semibold ${atLimit ? "text-red-500" : "text-foreground"}`}>
              {seatsUsed} of {seatLimit} used
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${atLimit ? "bg-red-500" : seatPercent > 80 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${seatPercent}%` }}
            />
          </div>
          {atLimit && (
            <p className="text-caption text-red-500 mt-2 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Seat limit reached. Contact the event organizer to increase your limit.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invite form */}
      {showInvite && (
        <Card className="mb-6 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body font-semibold">Invite Team Member</h3>
              <button onClick={() => { setShowInvite(false); setError(null); }}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-caption font-medium mb-1.5 block">Name *</label>
                <Input
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-caption font-medium mb-1.5 block">Email *</label>
                <Input
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@company.com"
                  type="email"
                />
              </div>
              <div>
                <label className="text-caption font-medium mb-1.5 block">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                  className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-caption text-red-500 mt-3 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <Button onClick={inviteMember} disabled={saving || !inviteForm.name || !inviteForm.email}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Invite
              </Button>
              <Button variant="ghost" onClick={() => { setShowInvite(false); setError(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role legend */}
      <div className="grid gap-2 sm:grid-cols-5 mb-6">
        {ROLES.map((r) => (
          <div key={r.value} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <r.icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-medium">{r.label}</p>
              <p className="text-[9px] text-muted-foreground">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No team members yet.</p>
            <p className="text-caption text-muted-foreground mt-1">Invite your team to collaborate.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const initials = member.name
              ? member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              : "?";
            const isPending = member.invite_status !== "accepted";
            return (
              <Card key={member.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-small font-medium shrink-0 ${
                      isPending ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-medium truncate">{member.name || member.email}</p>
                        <Badge variant="outline" className="text-[9px] capitalize">{member.role}</Badge>
                        {isPending && (
                          <Badge variant="secondary" className="text-[9px]">Pending</Badge>
                        )}
                      </div>
                      <p className="text-caption text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isPending && member.invite_code && (
                        <button
                          onClick={() => copyInviteLink(member)}
                          className="p-2 rounded-lg hover:bg-secondary transition-colors"
                          title="Copy invite link"
                        >
                          {copiedId === member.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(member.id)}
                        disabled={deleting === member.id}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Remove member"
                      >
                        {deleting === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
