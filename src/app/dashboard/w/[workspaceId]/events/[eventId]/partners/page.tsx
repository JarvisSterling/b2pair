"use client";

import { useEffect, useState } from "react";
import { useSWRFetch } from "@/hooks/use-swr-fetch";
import { useRealtime } from "@/hooks/use-realtime";
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
import type { Company, CompanyStatus, SponsorTier, SponsorProfile, ExhibitorProfile, CompanyMember } from "@/types/sponsors";
import { SafeImage } from "@/components/ui/safe-image";
import { toast } from "sonner";

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

  const { data: companiesData, isLoading: companiesLoading, mutate: mutateCompanies } = useSWRFetch<{ companies: Company[] }>(`/api/events/${eventId}/companies`);
  const { data: tiersData, isLoading: tiersLoading, mutate: mutateTiers } = useSWRFetch<{ tiers: SponsorTier[] }>(`/api/events/${eventId}/sponsor-tiers`);

  const companies = companiesData?.companies || [];
  const tiers = tiersData?.tiers || [];
  const loading = companiesLoading || tiersLoading;

  // Real-time: re-fetch when companies change for this event
  useRealtime({
    table: "companies",
    filter: { event_id: eventId },
    onChanged: () => mutateCompanies(),
  });

  const [eventSlug, setEventSlug] = useState<string | null>(null);
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
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Settings
  const [autoPublish, setAutoPublish] = useState(false);
  const [sponsorsEnabled, setSponsorsEnabled] = useState(false);
  const [exhibitorsEnabled, setExhibitorsEnabled] = useState(false);

  const [sponsorForm, setSponsorForm] = useState({ name: "", contact_email: "", tier_id: "", team_limit: "", company_size: "", website: "" });
  const [exhibitorForm, setExhibitorForm] = useState({ name: "", contact_email: "", booth_type: "", booth_number: "", team_limit: "", company_size: "", website: "" });
  const [tierForm, setTierForm] = useState({ name: "", color: "#6366f1", rank: 1, seat_limit: 5, perks: {} as Record<string, boolean | number> });

  const sponsors = companies.filter((c) => c.capabilities.includes("sponsor"));
  const exhibitors = companies.filter((c) => c.capabilities.includes("exhibitor"));

  // Load event slug for invite links
  useEffect(() => {
    async function loadEventSlug() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.from("events").select("slug").eq("id", eventId).single();
      if (data) setEventSlug(data.slug);
    }
    loadEventSlug();
  }, [eventId]);

  async function addSponsor() {
    if (!sponsorForm.name || !sponsorForm.contact_email) {
      toast.error("Company name and email required");
      return;
    }
    setSaving(true);
    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/events/${eventId}/companies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: sponsorForm.name,
              contact_email: sponsorForm.contact_email,
              capabilities: ["sponsor"],
              tier_id: sponsorForm.tier_id || undefined,
              team_limit: sponsorForm.team_limit ? parseInt(sponsorForm.team_limit) : undefined,
              company_size: sponsorForm.company_size || undefined,
              website: sponsorForm.website || undefined,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || "Failed to create sponsor");
          }
        })(),
        {
          loading: "Creating sponsor...",
          success: "Sponsor invited",
          error: (error) => (error instanceof Error ? error.message : "Failed to create sponsor"),
        }
      );
      mutateCompanies(); mutateTiers();
      setSponsorForm({ name: "", contact_email: "", tier_id: "", team_limit: "", company_size: "", website: "" });
      setShowAddSponsor(false);
    } finally {
      setSaving(false);
    }
  }

  async function addExhibitor() {
    if (!exhibitorForm.name || !exhibitorForm.contact_email) {
      toast.error("Company name and email required");
      return;
    }
    setSaving(true);
    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/events/${eventId}/companies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: exhibitorForm.name,
              contact_email: exhibitorForm.contact_email,
              capabilities: ["exhibitor"],
              booth_type: exhibitorForm.booth_type || undefined,
              booth_number: exhibitorForm.booth_number || undefined,
              team_limit: exhibitorForm.team_limit ? parseInt(exhibitorForm.team_limit) : undefined,
              company_size: exhibitorForm.company_size || undefined,
              website: exhibitorForm.website || undefined,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || "Failed to create exhibitor");
          }
        })(),
        {
          loading: "Creating exhibitor...",
          success: "Exhibitor invited",
          error: (error) => (error instanceof Error ? error.message : "Failed to create exhibitor"),
        }
      );
      mutateCompanies(); mutateTiers();
      setExhibitorForm({ name: "", contact_email: "", booth_type: "", booth_number: "", team_limit: "", company_size: "", website: "" });
      setShowAddExhibitor(false);
    } finally {
      setSaving(false);
    }
  }

  async function addTier() {
    if (!tierForm.name) {
      toast.error("Tier name required");
      return;
    }
    setSaving(true);
    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/events/${eventId}/sponsor-tiers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tierForm),
          });
          if (!res.ok) throw new Error("Failed to create tier");
        })(),
        {
          loading: "Creating tier...",
          success: "Tier created",
          error: "Failed to create tier",
        }
      );
      mutateCompanies(); mutateTiers();
      setTierForm({ name: "", color: "#6366f1", rank: tiers.length + 1, seat_limit: 5, perks: {} });
      setShowAddTier(false);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(companyId: string, status: string, reason?: string) {
    setSaving(true);
    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/events/${eventId}/companies/${companyId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, rejection_reason: reason }),
          });
          if (!res.ok) throw new Error("Failed to update status");
        })(),
        {
          loading: "Saving...",
          success:
            status === "approved"
              ? "Company approved"
              : status === "rejected"
              ? "Company rejected"
              : status === "live"
              ? "Company published"
              : "Status updated",
          error: "Failed to save",
        }
      );
      mutateCompanies(); mutateTiers();
      setShowRejectModal(null);
      setRejectionReason("");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(id: string) {
    setDeleting(id);
    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/events/${eventId}/companies/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete company");
        })(),
        {
          loading: "Deleting...",
          success: "Company deleted",
          error: "Failed to delete",
        }
      );
      mutateCompanies(); mutateTiers();
    } finally {
      setDeleting(null);
    }
  }

  async function deleteTier(id: string) {
    setDeleting(id);
    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/events/${eventId}/sponsor-tiers?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete tier");
        })(),
        {
          loading: "Deleting...",
          success: "Tier deleted",
          error: "Failed to delete",
        }
      );
      mutateCompanies(); mutateTiers();
    } finally {
      setDeleting(null);
    }
  }

  function copyInviteLink(inviteCode: string, companyId: string) {
    const slug = eventSlug || eventId;
    const url = `${window.location.origin}/events/${slug}/partners/onboard/${inviteCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
    setCopiedLink(companyId);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  async function openCompanyDetail(companyId: string) {
    setDetailLoading(true);
    setSelectedCompany(null);
    try {
      const res = await fetch(`/api/events/${eventId}/companies/${companyId}`);
      if (!res.ok) throw new Error("Failed to load company");
      const { company } = await res.json();
      setSelectedCompany(company);
    } catch {
      toast.error("Failed to load company");
    } finally {
      setDetailLoading(false);
    }
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
                      {tiers.map((t) => (<option key={t.id} value={t.id}>{t.name} ({t.seat_limit} seats)</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Team member limit</label>
                    <Input
                      type="number"
                      min="1"
                      value={sponsorForm.team_limit}
                      onChange={(e) => setSponsorForm((f) => ({ ...f, team_limit: e.target.value }))}
                      placeholder={sponsorForm.tier_id ? `Tier default: ${tiers.find((t) => t.id === sponsorForm.tier_id)?.seat_limit || 5}` : "Default: 5"}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use tier default</p>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company size</label>
                    <select
                      value={sponsorForm.company_size}
                      onChange={(e) => setSponsorForm((f) => ({ ...f, company_size: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">Select...</option>
                      <option value="1-10">1–10 employees</option>
                      <option value="11-50">11–50 employees</option>
                      <option value="51-200">51–200 employees</option>
                      <option value="201-1000">201–1,000 employees</option>
                      <option value="1000+">1,000+ employees</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">Pre-fills for team members</p>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company website</label>
                    <Input
                      value={sponsorForm.website}
                      onChange={(e) => setSponsorForm((f) => ({ ...f, website: e.target.value }))}
                      placeholder="https://..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Pre-fills for team members</p>
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
            onView={openCompanyDetail}
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
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Team member limit</label>
                    <Input type="number" min="1" value={exhibitorForm.team_limit} onChange={(e) => setExhibitorForm((f) => ({ ...f, team_limit: e.target.value }))} placeholder="Default: 5" />
                    <p className="text-[10px] text-muted-foreground mt-1">Leave empty for default (5)</p>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company size</label>
                    <select
                      value={exhibitorForm.company_size}
                      onChange={(e) => setExhibitorForm((f) => ({ ...f, company_size: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">Select...</option>
                      <option value="1-10">1–10 employees</option>
                      <option value="11-50">11–50 employees</option>
                      <option value="51-200">51–200 employees</option>
                      <option value="201-1000">201–1,000 employees</option>
                      <option value="1000+">1,000+ employees</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">Pre-fills for team members</p>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company website</label>
                    <Input
                      value={exhibitorForm.website}
                      onChange={(e) => setExhibitorForm((f) => ({ ...f, website: e.target.value }))}
                      placeholder="https://..."
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Pre-fills for team members</p>
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
            onView={openCompanyDetail}
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

      {/* Company detail slide-over */}
      {(selectedCompany || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedCompany(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-background border-l border-border shadow-2xl overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedCompany && (
              <CompanyDetailPanel
                company={selectedCompany}
                tiers={tiers}
                eventSlug={eventSlug || eventId}
                onClose={() => setSelectedCompany(null)}
                onApprove={(id) => { changeStatus(id, "approved"); setSelectedCompany(null); }}
                onReject={(id) => { setSelectedCompany(null); setShowRejectModal(id); }}
                onPublish={(id) => { changeStatus(id, "live"); setSelectedCompany(null); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Company detail slide-over panel for organizers */
function CompanyDetailPanel({
  company,
  tiers,
  eventSlug,
  onClose,
  onApprove,
  onReject,
  onPublish,
}: {
  company: any;
  tiers: SponsorTier[];
  eventSlug: string;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  const [copiedInvite, setCopiedInvite] = useState(false);
  const sponsorProfile = Array.isArray(company.sponsor_profiles) ? company.sponsor_profiles[0] : company.sponsor_profiles;
  const exhibitorProfile = Array.isArray(company.exhibitor_profiles) ? company.exhibitor_profiles[0] : company.exhibitor_profiles;
  const members: any[] = company.company_members || [];
  const tier = sponsorProfile?.tier;
  const capabilities: string[] = company.capabilities || [];

  // Find the admin invite code for re-sharing
  const adminMember = members.find((m: any) => m.role === "admin");
  const inviteCode = adminMember?.invite_code;

  function copyInvite() {
    if (!inviteCode) return;
    const url = `${window.location.origin}/events/${eventSlug}/partners/onboard/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-border sticky top-0 bg-background z-10">
        {company.logo_url ? (
          <SafeImage src={company.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" width={48} height={48} />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg font-bold shrink-0">
            {company.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{company.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[company.status as CompanyStatus]}`}>
              {company.status}
            </span>
            {capabilities.map((cap: string) => (
              <Badge key={cap} variant="secondary" className="text-[10px] capitalize">{cap}</Badge>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Status actions */}
        {(company.status === "submitted" || company.status === "approved") && (
          <div className="flex gap-2">
            {company.status === "submitted" && (
              <>
                <Button size="sm" onClick={() => onApprove(company.id)}>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onReject(company.id)}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                </Button>
              </>
            )}
            {company.status === "approved" && (
              <Button size="sm" onClick={() => onPublish(company.id)}>
                <Globe className="mr-1.5 h-3.5 w-3.5" /> Publish
              </Button>
            )}
          </div>
        )}

        {/* Rejection reason */}
        {company.status === "rejected" && company.rejection_reason && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <p className="text-caption text-red-500">
              <span className="font-semibold">Rejected:</span> {company.rejection_reason}
            </p>
          </div>
        )}

        {/* Company info */}
        <section>
          <h3 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-3">Company Info</h3>
          <div className="space-y-2">
            {company.description_short && (
              <p className="text-body text-muted-foreground">{company.description_short}</p>
            )}
            {company.description_long && (
              <p className="text-caption text-muted-foreground">{company.description_long}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {company.website && (
                <DetailField label="Website" value={company.website} link />
              )}
              {company.industry && (
                <DetailField label="Industry" value={company.industry} />
              )}
              {company.hq_location && (
                <DetailField label="Location" value={company.hq_location} />
              )}
              {company.contact_email && (
                <DetailField label="Contact" value={company.contact_email} />
              )}
            </div>
            {inviteCode && (
              <div className="mt-3">
                <Button size="sm" variant="outline" className="text-xs" onClick={copyInvite}>
                  {copiedInvite ? <Check className="mr-1.5 h-3 w-3" /> : <Copy className="mr-1.5 h-3 w-3" />}
                  {copiedInvite ? "Link Copied!" : "Copy Invite Link"}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Banner */}
        {company.banner_url && (
          <SafeImage src={company.banner_url} alt="Banner" className="w-full h-32 object-cover rounded-lg" width={400} height={128} />
        )}

        {/* Sponsor details */}
        {sponsorProfile && (
          <section>
            <h3 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Crown className="inline h-3.5 w-3.5 mr-1" />
              Sponsor Details
            </h3>
            <div className="space-y-3">
              {tier && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
                  <span className="text-body font-medium">{tier.name}</span>
                  <Badge variant="outline" className="text-[10px]">Rank {tier.rank}</Badge>
                </div>
              )}
              {sponsorProfile.tagline && (
                <p className="text-caption text-muted-foreground italic">&ldquo;{sponsorProfile.tagline}&rdquo;</p>
              )}
              {sponsorProfile.cta_buttons?.length > 0 && (
                <div>
                  <p className="text-caption font-medium mb-1.5">CTA Buttons</p>
                  <div className="flex gap-2 flex-wrap">
                    {sponsorProfile.cta_buttons.map((cta: any, i: number) => (
                      <a key={i} href={cta.url} target="_blank" rel="noopener noreferrer" className="text-caption text-primary underline">
                        {cta.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {sponsorProfile.downloadables?.length > 0 && (
                <div>
                  <p className="text-caption font-medium mb-1.5">Downloadables</p>
                  <div className="space-y-1">
                    {sponsorProfile.downloadables.map((dl: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-caption">
                        <span className="text-muted-foreground">{dl.type}</span>
                        <span className="font-medium">{dl.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sponsorProfile.promo_video_url && (
                <DetailField label="Promo Video" value={sponsorProfile.promo_video_url} link />
              )}
              {sponsorProfile.sessions?.length > 0 && (
                <div>
                  <p className="text-caption font-medium mb-1.5">Sessions</p>
                  {sponsorProfile.sessions.map((s: any, i: number) => (
                    <div key={i} className="text-caption mb-1">
                      <span className="font-medium">{s.title}</span> — {s.speaker_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Exhibitor details */}
        {exhibitorProfile && (
          <section>
            <h3 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Building2 className="inline h-3.5 w-3.5 mr-1" />
              Exhibitor Details
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {exhibitorProfile.booth_number && (
                  <DetailField label="Booth" value={exhibitorProfile.booth_number} />
                )}
                {exhibitorProfile.booth_type && (
                  <DetailField label="Booth Type" value={exhibitorProfile.booth_type} />
                )}
              </div>
              {exhibitorProfile.product_categories?.length > 0 && (
                <div>
                  <p className="text-caption font-medium mb-1.5">Categories</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {exhibitorProfile.product_categories.map((cat: string) => (
                      <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {exhibitorProfile.products?.length > 0 && (
                <div>
                  <p className="text-caption font-medium mb-1.5">Products ({exhibitorProfile.products.length})</p>
                  <div className="space-y-2">
                    {exhibitorProfile.products.map((p: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                        {p.image_url && <SafeImage src={p.image_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" width={40} height={40} />}
                        <div>
                          <p className="text-caption font-medium">{p.name}</p>
                          {p.description && <p className="text-[11px] text-muted-foreground">{p.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {exhibitorProfile.resources?.length > 0 && (
                <div>
                  <p className="text-caption font-medium mb-1.5">Resources</p>
                  {exhibitorProfile.resources.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-caption">
                      <span className="text-muted-foreground">{r.type}</span>
                      <span className="font-medium">{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Team members */}
        <TeamSection companyId={company.id} members={members} />

        {/* Timestamps */}
        <section className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Created" value={new Date(company.created_at).toLocaleDateString()} />
            <DetailField label="Updated" value={new Date(company.updated_at).toLocaleDateString()} />
          </div>
        </section>
      </div>
    </div>
  );
}

/** Small info field for detail panel */
function DetailField({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {link ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-caption text-primary hover:underline truncate block">
          {value}
        </a>
      ) : (
        <p className="text-caption font-medium truncate">{value}</p>
      )}
    </div>
  );
}

/** Team section with invite functionality */
function TeamSection({ companyId, members: initialMembers }: { companyId: string; members: any[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "representative" });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);

  function copyMemberInvite(member: any) {
    const url = `${window.location.origin}/partners/invite/${member.invite_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
    setCopiedMemberId(member.id);
    setTimeout(() => setCopiedMemberId(null), 2000);
  }

  async function inviteMember() {
    if (!inviteForm.email) {
      toast.error("Email required");
      return;
    }
    setInviting(true);
    setInviteError(null);
    setNewInviteLink(null);
    const toastId = toast.loading("Sending invite...");
    try {
      const res = await fetch(`/api/companies/${companyId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to invite");
      toast.success("Invite sent", { id: toastId });

      // Add new member to list
      setMembers((prev) => [...prev, json.member]);
      const link = `${window.location.origin}/partners/invite/${json.invite_code}`;
      setNewInviteLink(link);
      navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
      setInviteForm({ email: "", name: "", role: "representative" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to invite";
      toast.error(message, { id: toastId });
      setInviteError(message);
    } finally {
      setInviting(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
          <Users className="inline h-3.5 w-3.5 mr-1" />
          Team ({members.length})
        </h3>
        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setShowInvite(!showInvite); setNewInviteLink(null); setInviteError(null); }}>
          <Plus className="mr-1 h-3 w-3" /> Invite
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-muted/20 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={inviteForm.name}
              onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="text-caption h-8"
            />
            <Input
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email *"
              type="email"
              className="text-caption h-8"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
              className="h-8 rounded bg-input px-2 text-caption border border-border flex-1"
            >
              <option value="manager">Manager</option>
              <option value="representative">Representative</option>
              <option value="scanner">Scanner</option>
              <option value="speaker">Speaker</option>
            </select>
            <Button size="sm" className="text-xs h-8" onClick={inviteMember} disabled={inviting || !inviteForm.email}>
              {inviting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
              Invite
            </Button>
          </div>
          {inviteError && (
            <p className="text-[11px] text-destructive">{inviteError}</p>
          )}
          {newInviteLink && (
            <div className="flex items-center gap-2 p-2 rounded bg-green-500/5 border border-green-500/20">
              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <p className="text-[11px] text-green-600 flex-1">Invited! Link copied to clipboard.</p>
            </div>
          )}
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        {members.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {(m.name || m.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-caption font-medium truncate">{m.name || m.email}</p>
              <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
            </div>
            <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
            {m.invite_status === "accepted" ? (
              <span className="text-[10px] text-green-500">accepted</span>
            ) : m.invite_code ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-[10px] h-6 px-2"
                onClick={() => copyMemberInvite(m)}
              >
                {copiedMemberId === m.id ? (
                  <><Check className="mr-1 h-3 w-3 text-green-500" /> Copied!</>
                ) : (
                  <><Copy className="mr-1 h-3 w-3" /> Copy Link</>
                )}
              </Button>
            ) : (
              <span className="text-[10px] text-muted-foreground">{m.invite_status}</span>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-caption text-muted-foreground text-center py-4">No team members yet.</p>
        )}
      </div>
    </section>
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
  onView,
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
  onView: (id: string) => void;
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
        <Card key={company.id} className="group cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onView(company.id)}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <SafeImage src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" width={40} height={40} />
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
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                {company.status === "invited" && (company as any).invite_code && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => copyInviteLink((company as any).invite_code, company.id)}
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
