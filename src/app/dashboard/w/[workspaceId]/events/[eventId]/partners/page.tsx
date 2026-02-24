"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Loader2,
  Building2,
  Crown,
  X,
  Save,
  Check,
  XCircle,
  Eye,
  Send,
  Link2,
  Copy,
  Users,
  BarChart3,
  Settings2,
  ChevronRight,
  GripVertical,
  Globe,
} from "lucide-react";
import type { Company, CompanyStatus, SponsorTier } from "@/types/sponsors";

type ActiveTab = "sponsors" | "exhibitors" | "tiers" | "settings";

const STATUS_COLORS: Record<CompanyStatus, string> = {
  invited: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  onboarding: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  submitted: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  live: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_ORDER: CompanyStatus[] = ["invited", "onboarding", "submitted", "approved", "live", "rejected"];

export default function PartnersPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("sponsors");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Forms
  const [showAddSponsor, setShowAddSponsor] = useState(false);
  const [showAddExhibitor, setShowAddExhibitor] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Settings
  const [autoPublish, setAutoPublish] = useState(false);
  const [sponsorsEnabled, setSponsorsEnabled] = useState(false);
  const [exhibitorsEnabled, setExhibitorsEnabled] = useState(false);

  const [sponsorForm, setSponsorForm] = useState({ name: "", contact_email: "", tier_id: "" });
  const [exhibitorForm, setExhibitorForm] = useState({ name: "", contact_email: "", booth_type: "", booth_number: "" });
  const [tierForm, setTierForm] = useState({ name: "", color: "#6366f1", rank: 1, seat_limit: 5, perks: {} as Record<string, boolean | number> });

  const sponsors = companies.filter((c) => c.capabilities.includes("sponsor"));
  const exhibitors = companies.filter((c) => c.capabilities.includes("exhibitor"));

  const loadData = useCallback(async () => {
    const [companiesRes, tiersRes, eventRes] = await Promise.all([
      fetch(`/api/events/${eventId}/companies`),
      fetch(`/api/events/${eventId}/sponsor-tiers`),
      fetch(`/api/events/${eventId}/companies?_event_settings=1`),
    ]);

    const companiesData = await companiesRes.json();
    const tiersData = await tiersRes.json();

    setCompanies(companiesData.companies || []);
    setTiers(tiersData.tiers || []);
    setLoading(false);
  }, [eventId]);

  // Load event settings separately
  useEffect(() => {
    async function loadSettings() {
      const res = await fetch(`/api/events/${eventId}/companies`);
      if (res.ok) {
        // Settings are loaded from the event itself, not this endpoint
        // We'll use a lightweight approach
      }
    }
    loadSettings();
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function addSponsor() {
    if (!sponsorForm.name || !sponsorForm.contact_email) return;
    setSaving(true);
    const res = await fetch(`/api/events/${eventId}/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sponsorForm.name,
        contact_email: sponsorForm.contact_email,
        capabilities: ["sponsor"],
        tier_id: sponsorForm.tier_id || undefined,
      }),
    });
    if (res.ok) {
      await loadData();
      setSponsorForm({ name: "", contact_email: "", tier_id: "" });
      setShowAddSponsor(false);
    }
    setSaving(false);
  }

  async function addExhibitor() {
    if (!exhibitorForm.name || !exhibitorForm.contact_email) return;
    setSaving(true);
    const res = await fetch(`/api/events/${eventId}/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: exhibitorForm.name,
        contact_email: exhibitorForm.contact_email,
        capabilities: ["exhibitor"],
        booth_type: exhibitorForm.booth_type || undefined,
        booth_number: exhibitorForm.booth_number || undefined,
      }),
    });
    if (res.ok) {
      await loadData();
      setExhibitorForm({ name: "", contact_email: "", booth_type: "", booth_number: "" });
      setShowAddExhibitor(false);
    }
    setSaving(false);
  }

  async function addTier() {
    if (!tierForm.name) return;
    setSaving(true);
    await fetch(`/api/events/${eventId}/sponsor-tiers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tierForm),
    });
    await loadData();
    setTierForm({ name: "", color: "#6366f1", rank: tiers.length + 1, seat_limit: 5, perks: {} });
    setShowAddTier(false);
    setSaving(false);
  }

  async function changeStatus(companyId: string, status: string, reason?: string) {
    setSaving(true);
    await fetch(`/api/events/${eventId}/companies/${companyId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejection_reason: reason }),
    });
    await loadData();
    setShowRejectModal(null);
    setRejectionReason("");
    setSaving(false);
  }

  async function deleteCompany(id: string) {
    setDeleting(id);
    await fetch(`/api/events/${eventId}/companies/${id}`, { method: "DELETE" });
    await loadData();
    setDeleting(null);
  }

  async function deleteTier(id: string) {
    setDeleting(id);
    await fetch(`/api/events/${eventId}/sponsor-tiers?id=${id}`, { method: "DELETE" });
    await loadData();
    setDeleting(null);
  }

  function copyInviteLink(inviteCode: string, companyId: string) {
    const url = `${window.location.origin}/events/${eventId}/partners/onboard/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(companyId);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Partners</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {sponsors.length} sponsor{sponsors.length !== 1 ? "s" : ""} · {exhibitors.length} exhibitor{exhibitors.length !== 1 ? "s" : ""} · {tiers.length} tier{tiers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {([
          { key: "sponsors" as const, label: "Sponsors", count: sponsors.length, icon: Crown },
          { key: "exhibitors" as const, label: "Exhibitors", count: exhibitors.length, icon: Building2 },
          { key: "tiers" as const, label: "Tiers", count: tiers.length, icon: BarChart3 },
          { key: "settings" as const, label: "Settings", icon: Settings2 },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-caption font-medium border-b-2 -mb-px transition-all ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
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

      {/* SPONSORS TAB */}
      {activeTab === "sponsors" && (
        <div>
          {/* Pipeline view */}
          <PipelineView companies={sponsors} />

          <div className="flex justify-end mb-4 mt-6">
            <Button onClick={() => setShowAddSponsor(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Sponsor
            </Button>
          </div>

          {/* Add sponsor form */}
          {showAddSponsor && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-body font-semibold">Add Sponsor</h3>
                  <button onClick={() => setShowAddSponsor(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company name *</label>
                    <Input value={sponsorForm.name} onChange={(e) => setSponsorForm((f) => ({ ...f, name: e.target.value }))} placeholder="Company name" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Contact email *</label>
                    <Input value={sponsorForm.contact_email} onChange={(e) => setSponsorForm((f) => ({ ...f, contact_email: e.target.value }))} placeholder="contact@company.com" type="email" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Tier</label>
                    <select
                      value={sponsorForm.tier_id}
                      onChange={(e) => setSponsorForm((f) => ({ ...f, tier_id: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">Select tier...</option>
                      {tiers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={addSponsor} disabled={saving || !sponsorForm.name || !sponsorForm.contact_email}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Create & Send Invite
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddSponsor(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company list */}
          <CompanyList
            companies={sponsors}
            tiers={tiers}
            type="sponsor"
            onApprove={(id) => changeStatus(id, "approved")}
            onReject={(id) => setShowRejectModal(id)}
            onPublish={(id) => changeStatus(id, "live")}
            onDelete={deleteCompany}
            deleting={deleting}
            copyInviteLink={copyInviteLink}
            copiedLink={copiedLink}
          />
        </div>
      )}

      {/* EXHIBITORS TAB */}
      {activeTab === "exhibitors" && (
        <div>
          <PipelineView companies={exhibitors} />

          <div className="flex justify-end mb-4 mt-6">
            <Button onClick={() => setShowAddExhibitor(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Exhibitor
            </Button>
          </div>

          {showAddExhibitor && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-body font-semibold">Add Exhibitor</h3>
                  <button onClick={() => setShowAddExhibitor(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company name *</label>
                    <Input value={exhibitorForm.name} onChange={(e) => setExhibitorForm((f) => ({ ...f, name: e.target.value }))} placeholder="Company name" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Contact email *</label>
                    <Input value={exhibitorForm.contact_email} onChange={(e) => setExhibitorForm((f) => ({ ...f, contact_email: e.target.value }))} placeholder="contact@company.com" type="email" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Booth type</label>
                    <select
                      value={exhibitorForm.booth_type}
                      onChange={(e) => setExhibitorForm((f) => ({ ...f, booth_type: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">Select type...</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Island">Island</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Booth number</label>
                    <Input value={exhibitorForm.booth_number} onChange={(e) => setExhibitorForm((f) => ({ ...f, booth_number: e.target.value }))} placeholder="e.g. A12" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={addExhibitor} disabled={saving || !exhibitorForm.name || !exhibitorForm.contact_email}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Create & Send Invite
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddExhibitor(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <CompanyList
            companies={exhibitors}
            tiers={tiers}
            type="exhibitor"
            onApprove={(id) => changeStatus(id, "approved")}
            onReject={(id) => setShowRejectModal(id)}
            onPublish={(id) => changeStatus(id, "live")}
            onDelete={deleteCompany}
            deleting={deleting}
            copyInviteLink={copyInviteLink}
            copiedLink={copiedLink}
          />
        </div>
      )}

      {/* TIERS TAB */}
      {activeTab === "tiers" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setTierForm({ name: "", color: "#6366f1", rank: tiers.length + 1, seat_limit: 5, perks: {} }); setShowAddTier(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tier
            </Button>
          </div>

          {showAddTier && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-body font-semibold">New Tier</h3>
                  <button onClick={() => setShowAddTier(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Name *</label>
                    <Input value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Platinum" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={tierForm.color} onChange={(e) => setTierForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-10 rounded border cursor-pointer" />
                      <Input value={tierForm.color} onChange={(e) => setTierForm((f) => ({ ...f, color: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Rank (1 = highest)</label>
                    <Input type="number" value={tierForm.rank} onChange={(e) => setTierForm((f) => ({ ...f, rank: parseInt(e.target.value) || 1 }))} min={1} />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Seat limit</label>
                    <Input type="number" value={tierForm.seat_limit} onChange={(e) => setTierForm((f) => ({ ...f, seat_limit: parseInt(e.target.value) || 5 }))} min={1} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-caption font-medium mb-3 block">Perks</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: "logo_on_event_page", label: "Logo on event page" },
                        { key: "banner_placement", label: "Banner placement" },
                        { key: "featured_listing", label: "Featured listing" },
                        { key: "sessions_included", label: "Sessions included" },
                        { key: "analytics_access", label: "Analytics access" },
                      ].map((perk) => (
                        <label key={perk.key} className="flex items-center gap-2 text-caption cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!tierForm.perks[perk.key]}
                            onChange={(e) => setTierForm((f) => ({ ...f, perks: { ...f.perks, [perk.key]: e.target.checked } }))}
                            className="rounded"
                          />
                          {perk.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={addTier} disabled={saving || !tierForm.name}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Create Tier
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddTier(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tiers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No tiers yet.</p>
                <p className="mt-1 text-caption text-muted-foreground">Create tiers to organize sponsor packages with different perks.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tiers.map((tier) => {
                const tierSponsors = sponsors.filter((c) => {
                  const sp = (c as any).sponsor_profiles;
                  const profile = Array.isArray(sp) ? sp[0] : sp;
                  return profile?.tier_id === tier.id;
                });
                return (
                  <Card key={tier.id} className="group">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: tier.color + "22" }}>
                          <Crown className="h-5 w-5" style={{ color: tier.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-body font-medium">{tier.name}</p>
                            <Badge variant="outline" className="text-[10px]">Rank {tier.rank}</Badge>
                            <span className="text-[10px] text-muted-foreground">{tierSponsors.length} sponsors</span>
                          </div>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{tier.seat_limit} seats</span>
                            {Object.entries(tier.perks || {}).filter(([, v]) => v).map(([key]) => (
                              <Badge key={key} variant="secondary" className="text-[9px]">
                                {key.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTier(tier.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-secondary transition-opacity"
                          disabled={deleting === tier.id}
                        >
                          {deleting === tier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-body font-semibold mb-4">Partner Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-body font-medium">Auto-publish on approval</p>
                    <p className="text-caption text-muted-foreground">When enabled, companies go live immediately after approval instead of requiring a separate publish step.</p>
                  </div>
                  <button
                    onClick={async () => {
                      // TODO: Save to event settings
                      setAutoPublish(!autoPublish);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPublish ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${autoPublish ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </label>
                <div className="border-t border-border" />
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-body font-medium">Enable Sponsors</p>
                    <p className="text-caption text-muted-foreground">Show sponsor features for this event.</p>
                  </div>
                  <button
                    onClick={() => setSponsorsEnabled(!sponsorsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sponsorsEnabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${sponsorsEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </label>
                <div className="border-t border-border" />
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-body font-medium">Enable Exhibitors</p>
                    <p className="text-caption text-muted-foreground">Show exhibitor features for this event.</p>
                  </div>
                  <button
                    onClick={() => setExhibitorsEnabled(!exhibitorsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${exhibitorsEnabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${exhibitorsEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="pt-6">
              <h3 className="text-body font-semibold mb-2">Reject Submission</h3>
              <p className="text-caption text-muted-foreground mb-4">Provide a reason so the company can fix issues and resubmit.</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Reason for rejection..."
                className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRejectModal(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => changeStatus(showRejectModal, "rejected", rejectionReason)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/** Pipeline status bar showing counts per status */
function PipelineView({ companies }: { companies: Company[] }) {
  const counts = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = companies.filter((c) => c.status === status).length;
    return acc;
  }, {} as Record<CompanyStatus, number>);

  const total = companies.length;
  if (total === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {STATUS_ORDER.map((status) => {
        if (counts[status] === 0) return null;
        return (
          <div
            key={status}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-caption font-medium ${STATUS_COLORS[status]}`}
          >
            <span className="capitalize">{status}</span>
            <span className="font-bold">{counts[status]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Company list with status-based actions */
function CompanyList({
  companies,
  tiers,
  type,
  onApprove,
  onReject,
  onPublish,
  onDelete,
  deleting,
  copyInviteLink,
  copiedLink,
}: {
  companies: Company[];
  tiers: SponsorTier[];
  type: "sponsor" | "exhibitor";
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
  copyInviteLink: (code: string, companyId: string) => void;
  copiedLink: string | null;
}) {
  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="text-body text-muted-foreground">
            No {type}s yet. Add your first {type} above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {companies.map((company) => (
        <Card key={company.id} className="group">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-small font-bold shrink-0">
                  {company.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-body font-medium truncate">{company.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[company.status]}`}>
                    {company.status}
                  </span>
                  {(company as any).members_count > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {(company as any).members_count}
                    </span>
                  )}
                </div>
                {company.description_short && (
                  <p className="text-caption text-muted-foreground truncate mt-0.5">{company.description_short}</p>
                )}
              </div>

              {/* Status actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {company.status === "submitted" && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onApprove(company.id)}>
                      <Check className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-8 text-destructive hover:text-destructive" onClick={() => onReject(company.id)}>
                      <XCircle className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </>
                )}
                {company.status === "approved" && (
                  <Button size="sm" className="text-xs h-8" onClick={() => onPublish(company.id)}>
                    <Globe className="mr-1 h-3 w-3" /> Publish
                  </Button>
                )}
                {company.status === "invited" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => {
                      // We need the invite code from company_members
                      // For now, show copy feedback
                      // TODO: fetch invite code
                    }}
                  >
                    <Link2 className="mr-1 h-3 w-3" />
                    {copiedLink === company.id ? "Copied!" : "Copy Invite"}
                  </Button>
                )}
                <button
                  onClick={() => onDelete(company.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-secondary transition-opacity"
                  disabled={deleting === company.id}
                >
                  {deleting === company.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                </button>
              </div>
            </div>

            {/* Rejection reason */}
            {company.status === "rejected" && company.rejection_reason && (
              <div className="mt-3 ml-14 p-2 rounded bg-red-500/5 border border-red-500/10">
                <p className="text-caption text-red-500">
                  <span className="font-medium">Rejected:</span> {company.rejection_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
