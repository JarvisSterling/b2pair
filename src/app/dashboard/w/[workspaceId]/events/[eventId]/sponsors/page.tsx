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
  Pencil,
  X,
  Save,
  Globe,
  Mail,
  User,
  Star,
  BarChart3,
} from "lucide-react";

interface Tier {
  id: string;
  name: string;
  description: string | null;
  color: string;
  priority_matching: boolean;
  featured_in_recommendations: boolean;
  dedicated_meeting_slots: number;
  analytics_access: boolean;
  sort_order: number;
}

interface Sponsor {
  id: string;
  tier_id: string | null;
  company_name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  sort_order: number;
}

interface Booth {
  id: string;
  sponsor_id: string | null;
  company_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_published: boolean;
  booth_products: any[];
  booth_documents: any[];
}

export default function SponsorManagementPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"sponsors" | "tiers" | "booths">("sponsors");
  const [showTierForm, setShowTierForm] = useState(false);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [showBoothForm, setShowBoothForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const [tierForm, setTierForm] = useState({
    name: "", description: "", color: "#FFD700",
    priority_matching: false, featured_in_recommendations: false,
    dedicated_meeting_slots: 0, analytics_access: false,
  });

  const [sponsorForm, setSponsorForm] = useState({
    company_name: "", tier_id: "", website_url: "",
    description: "", contact_name: "", contact_email: "", logo_url: "",
  });

  const [boothForm, setBoothForm] = useState({
    company_name: "", sponsor_id: "", tagline: "",
    description: "", website_url: "", logo_url: "",
  });

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/sponsors?eventId=${eventId}`);
    const data = await res.json();
    setTiers(data.tiers || []);
    setSponsors(data.sponsors || []);
    setBooths(data.booths || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  function resetSponsorForm() {
    setSponsorForm({ company_name: "", tier_id: "", website_url: "", description: "", contact_name: "", contact_email: "", logo_url: "" });
    setEditingSponsor(null);
    setShowSponsorForm(false);
  }

  function editSponsor(s: Sponsor) {
    setSponsorForm({
      company_name: s.company_name,
      tier_id: s.tier_id || "",
      website_url: s.website_url || "",
      description: s.description || "",
      contact_name: s.contact_name || "",
      contact_email: s.contact_email || "",
      logo_url: s.logo_url || "",
    });
    setEditingSponsor(s);
    setShowSponsorForm(true);
  }

  async function saveTier() {
    if (!tierForm.name) return;
    setSaving(true);
    await fetch("/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "tier",
        event_id: eventId,
        ...tierForm,
        sort_order: tiers.length,
      }),
    });
    await loadData();
    setTierForm({ name: "", description: "", color: "#FFD700", priority_matching: false, featured_in_recommendations: false, dedicated_meeting_slots: 0, analytics_access: false });
    setShowTierForm(false);
    setSaving(false);
  }

  async function saveSponsor() {
    if (!sponsorForm.company_name) return;
    setSaving(true);
    const payload = {
      type: "sponsor",
      event_id: eventId,
      company_name: sponsorForm.company_name,
      tier_id: sponsorForm.tier_id || null,
      website_url: sponsorForm.website_url || null,
      description: sponsorForm.description || null,
      contact_name: sponsorForm.contact_name || null,
      contact_email: sponsorForm.contact_email || null,
      logo_url: sponsorForm.logo_url || null,
    };

    if (editingSponsor) {
      await fetch("/api/sponsors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingSponsor.id }),
      });
    } else {
      await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await loadData();
    resetSponsorForm();
    setSaving(false);
  }

  async function saveBooth() {
    if (!boothForm.company_name) return;
    setSaving(true);
    await fetch("/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "booth",
        event_id: eventId,
        company_name: boothForm.company_name,
        sponsor_id: boothForm.sponsor_id || null,
        tagline: boothForm.tagline || null,
        description: boothForm.description || null,
        website_url: boothForm.website_url || null,
        logo_url: boothForm.logo_url || null,
      }),
    });
    await loadData();
    setBoothForm({ company_name: "", sponsor_id: "", tagline: "", description: "", website_url: "", logo_url: "" });
    setShowBoothForm(false);
    setSaving(false);
  }

  async function toggleBoothPublish(boothId: string, isPublished: boolean) {
    await fetch("/api/sponsors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "booth", id: boothId, is_published: !isPublished }),
    });
    await loadData();
  }

  async function handleDelete(type: string, id: string) {
    setDeleting(id);
    await fetch(`/api/sponsors?type=${type}&id=${id}`, { method: "DELETE" });
    await loadData();
    setDeleting(null);
  }

  const TIER_PRESETS = [
    { name: "Platinum", color: "#E5E4E2" },
    { name: "Gold", color: "#FFD700" },
    { name: "Silver", color: "#C0C0C0" },
    { name: "Bronze", color: "#CD7F32" },
  ];

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
          <h1 className="text-h1 font-semibold tracking-tight">Sponsors & Exhibitors</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {tiers.length} tiers · {sponsors.length} sponsors · {booths.length} booths
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {[
          { key: "sponsors", label: "Sponsors", count: sponsors.length },
          { key: "tiers", label: "Tiers", count: tiers.length },
          { key: "booths", label: "Exhibitor Booths", count: booths.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-caption font-medium border-b-2 -mb-px transition-all ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* SPONSORS TAB */}
      {activeTab === "sponsors" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetSponsorForm(); setShowSponsorForm(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add sponsor
            </Button>
          </div>

          {showSponsorForm && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-body font-semibold">{editingSponsor ? "Edit sponsor" : "New sponsor"}</h3>
                  <button onClick={resetSponsorForm}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company name</label>
                    <Input value={sponsorForm.company_name} onChange={(e) => setSponsorForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Company name" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Tier</label>
                    <select
                      value={sponsorForm.tier_id}
                      onChange={(e) => setSponsorForm((f) => ({ ...f, tier_id: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">No tier</option>
                      {tiers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Website</label>
                    <Input value={sponsorForm.website_url} onChange={(e) => setSponsorForm((f) => ({ ...f, website_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Logo URL</label>
                    <Input value={sponsorForm.logo_url} onChange={(e) => setSponsorForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Contact name</label>
                    <Input value={sponsorForm.contact_name} onChange={(e) => setSponsorForm((f) => ({ ...f, contact_name: e.target.value }))} placeholder="Name" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Contact email</label>
                    <Input value={sponsorForm.contact_email} onChange={(e) => setSponsorForm((f) => ({ ...f, contact_email: e.target.value }))} placeholder="email@company.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-caption font-medium mb-1.5 block">Description</label>
                    <textarea
                      value={sponsorForm.description}
                      onChange={(e) => setSponsorForm((f) => ({ ...f, description: e.target.value }))}
                      rows={2}
                      placeholder="About this sponsor"
                      className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={saveSponsor} disabled={saving || !sponsorForm.company_name}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingSponsor ? "Update" : "Create"}
                  </Button>
                  <Button variant="outline" onClick={resetSponsorForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {sponsors.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No sponsors yet.</p>
                <p className="mt-1 text-caption text-muted-foreground">Create tiers first, then add sponsors.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tiers.map((tier) => {
                const tierSponsors = sponsors.filter((s) => s.tier_id === tier.id);
                if (tierSponsors.length === 0) return null;
                return (
                  <div key={tier.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
                      <h3 className="text-caption font-semibold text-muted-foreground">{tier.name}</h3>
                      <span className="text-[10px] text-muted-foreground">({tierSponsors.length})</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {tierSponsors.map((sponsor) => (
                        <SponsorCard key={sponsor.id} sponsor={sponsor} tier={tier} onEdit={editSponsor} onDelete={handleDelete} deleting={deleting} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Untiered sponsors */}
              {sponsors.filter((s) => !s.tier_id).length > 0 && (
                <div>
                  <h3 className="text-caption font-semibold text-muted-foreground mb-2">No tier</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {sponsors.filter((s) => !s.tier_id).map((sponsor) => (
                      <SponsorCard key={sponsor.id} sponsor={sponsor} tier={null} onEdit={editSponsor} onDelete={handleDelete} deleting={deleting} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TIERS TAB */}
      {activeTab === "tiers" && (
        <div>
          <div className="flex justify-between mb-4">
            <div className="flex gap-1">
              {TIER_PRESETS.filter((p) => !tiers.find((t) => t.name === p.name)).map((preset) => (
                <Button
                  key={preset.name}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setTierForm((f) => ({ ...f, name: preset.name, color: preset.color }))}
                >
                  <div className="h-2 w-2 rounded-full mr-1" style={{ backgroundColor: preset.color }} />
                  {preset.name}
                </Button>
              ))}
            </div>
            <Button onClick={() => setShowTierForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add tier
            </Button>
          </div>

          {showTierForm && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <h3 className="text-body font-semibold mb-4">New tier</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Name</label>
                    <Input value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., Platinum" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={tierForm.color} onChange={(e) => setTierForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-10 rounded border cursor-pointer" />
                      <Input value={tierForm.color} onChange={(e) => setTierForm((f) => ({ ...f, color: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-caption font-medium mb-1.5 block">Description</label>
                    <Input value={tierForm.description} onChange={(e) => setTierForm((f) => ({ ...f, description: e.target.value }))} placeholder="What's included in this tier" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-caption font-medium mb-3 block">Benefits</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: "priority_matching", label: "Priority matching" },
                        { key: "featured_in_recommendations", label: "Featured in recommendations" },
                        { key: "analytics_access", label: "Analytics access" },
                      ].map((benefit) => (
                        <label key={benefit.key} className="flex items-center gap-2 text-caption cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(tierForm as any)[benefit.key]}
                            onChange={(e) => setTierForm((f) => ({ ...f, [benefit.key]: e.target.checked }))}
                            className="rounded"
                          />
                          {benefit.label}
                        </label>
                      ))}
                      <div className="flex items-center gap-2">
                        <label className="text-caption">Dedicated meeting slots:</label>
                        <Input
                          type="number"
                          value={tierForm.dedicated_meeting_slots}
                          onChange={(e) => setTierForm((f) => ({ ...f, dedicated_meeting_slots: parseInt(e.target.value) || 0 }))}
                          className="w-20"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={saveTier} disabled={saving || !tierForm.name}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create tier
                  </Button>
                  <Button variant="outline" onClick={() => setShowTierForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tiers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No tiers yet.</p>
                <p className="mt-1 text-caption text-muted-foreground">Use the presets above or create a custom tier.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tiers.map((tier) => {
                const tierSponsors = sponsors.filter((s) => s.tier_id === tier.id);
                return (
                  <Card key={tier.id} className="group">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: tier.color + "33" }}>
                          <Crown className="h-4 w-4" style={{ color: tier.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-body font-medium">{tier.name}</p>
                            <span className="text-[10px] text-muted-foreground">{tierSponsors.length} sponsors</span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            {tier.priority_matching && <Badge variant="outline" className="text-[9px]">Priority matching</Badge>}
                            {tier.featured_in_recommendations && <Badge variant="outline" className="text-[9px]">Featured</Badge>}
                            {tier.analytics_access && <Badge variant="outline" className="text-[9px]">Analytics</Badge>}
                            {tier.dedicated_meeting_slots > 0 && <Badge variant="outline" className="text-[9px]">{tier.dedicated_meeting_slots} slots</Badge>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete("tier", tier.id)}
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

      {/* BOOTHS TAB */}
      {activeTab === "booths" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowBoothForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create booth
            </Button>
          </div>

          {showBoothForm && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <h3 className="text-body font-semibold mb-4">New exhibitor booth</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company name</label>
                    <Input value={boothForm.company_name} onChange={(e) => setBoothForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Company name" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Linked sponsor</label>
                    <select
                      value={boothForm.sponsor_id}
                      onChange={(e) => setBoothForm((f) => ({ ...f, sponsor_id: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">None</option>
                      {sponsors.map((s) => (<option key={s.id} value={s.id}>{s.company_name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Tagline</label>
                    <Input value={boothForm.tagline} onChange={(e) => setBoothForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Short tagline" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Website</label>
                    <Input value={boothForm.website_url} onChange={(e) => setBoothForm((f) => ({ ...f, website_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-caption font-medium mb-1.5 block">Description</label>
                    <textarea
                      value={boothForm.description}
                      onChange={(e) => setBoothForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      placeholder="About this exhibitor"
                      className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={saveBooth} disabled={saving || !boothForm.company_name}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create booth
                  </Button>
                  <Button variant="outline" onClick={() => setShowBoothForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {booths.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No exhibitor booths yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {booths.map((booth) => {
                const sponsor = sponsors.find((s) => s.id === booth.sponsor_id);
                const tier = sponsor ? tiers.find((t) => t.id === sponsor.tier_id) : null;
                return (
                  <Card key={booth.id} className="group">
                    <CardContent className="py-5">
                      <div className="flex items-start gap-4">
                        {booth.logo_url ? (
                          <img src={booth.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary text-body font-bold shrink-0">
                            {booth.company_name[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-body font-semibold">{booth.company_name}</p>
                            {tier && (
                              <Badge variant="outline" className="text-[9px]" style={{ borderColor: tier.color, color: tier.color }}>
                                {tier.name}
                              </Badge>
                            )}
                            <Badge variant={booth.is_published ? "success" : "secondary"} className="text-[9px]">
                              {booth.is_published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                          {booth.tagline && <p className="text-caption text-muted-foreground">{booth.tagline}</p>}
                          <div className="flex items-center gap-3 mt-2 text-small text-muted-foreground">
                            <span>{booth.booth_products?.length || 0} products</span>
                            <span>{booth.booth_documents?.length || 0} documents</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => toggleBoothPublish(booth.id, booth.is_published)}
                          >
                            {booth.is_published ? "Unpublish" : "Publish"}
                          </Button>
                          <button
                            onClick={() => handleDelete("booth", booth.id)}
                            className="p-1.5 rounded hover:bg-secondary"
                            disabled={deleting === booth.id}
                          >
                            {deleting === booth.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
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
      )}
    </div>
  );
}

function SponsorCard({
  sponsor,
  tier,
  onEdit,
  onDelete,
  deleting,
}: {
  sponsor: Sponsor;
  tier: Tier | null;
  onEdit: (s: Sponsor) => void;
  onDelete: (type: string, id: string) => void;
  deleting: string | null;
}) {
  return (
    <Card className="group">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          {sponsor.logo_url ? (
            <img src={sponsor.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-small font-bold shrink-0">
              {sponsor.company_name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-body font-medium truncate">{sponsor.company_name}</p>
              {tier && (
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
              )}
            </div>
            <p className="text-caption text-muted-foreground truncate">
              {sponsor.contact_name || sponsor.website_url || "No contact info"}
            </p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(sponsor)} className="p-1.5 rounded hover:bg-secondary">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => onDelete("sponsor", sponsor.id)}
              className="p-1.5 rounded hover:bg-secondary"
              disabled={deleting === sponsor.id}
            >
              {deleting === sponsor.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
