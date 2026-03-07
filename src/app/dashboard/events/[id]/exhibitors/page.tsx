"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSWRFetch } from "@/hooks/use-swr-fetch";
import { useRealtime } from "@/hooks/use-realtime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Globe,
  Loader2,
  Search,
  ArrowLeft,
  MapPin,
  Tag,
  ExternalLink,
  MessageSquare,
  Calendar,
  ChevronRight,
  Users,
  Crown,
  X,
  Briefcase,
  Mail,
} from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { MeetingSlotPicker, SelectedSlot } from "@/components/meeting-slot-picker";

interface TeamMember {
  id: string;
  user_id: string;
  participant_id: string | null;
  name: string;
  title: string | null;
  avatar_url: string | null;
  role: string;
}

interface ParticipantDetail {
  id: string;
  role: string;
  intent: string | null;
  tags: string[];
  company_role: string | null;
  looking_for: string | null;
  offering: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    title: string | null;
    company_name: string | null;
    company_size: string | null;
    industry: string | null;
    bio: string | null;
    expertise_areas: string[];
  };
}

interface Exhibitor {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  description_short: string | null;
  description_long: string | null;
  logo_url: string | null;
  banner_url: string | null;
  team: TeamMember[];
  exhibitor_profiles: {
    booth_number: string | null;
    booth_type: string | null;
    product_categories: string[];
    products: { name: string; description: string | null; image_url: string | null; price_info: string | null }[];
    resources: { name: string; url: string; type: string }[];
  } | null;
}

const INTENT_LABELS: Record<string, string> = {
  buying: "Looking to buy",
  selling: "Looking to sell",
  investing: "Looking to invest",
  partnering: "Looking to partner",
  learning: "Looking to learn",
  networking: "Networking",
};

function trimAiPrefix(text: string): string {
  const m = text.match(/^As a .+?,\s+I(?:'m looking for|'m seeking| bring|'m offering)\s+(.+)$/i);
  return m ? m[1] : text;
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function ParticipantExhibitorsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Exhibitor | null>(null);

  // Meeting modal state
  const [meetingTarget, setMeetingTarget] = useState<TeamMember | null>(null);
  const [meetingNote, setMeetingNote] = useState("");
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [meetingType, setMeetingType] = useState("in-person");

  // Team member participant panel state
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [memberDetail, setMemberDetail] = useState<ParticipantDetail | null>(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (category) queryParams.set("category", category);

  const { data: exhibitorData, isLoading: loading, mutate } = useSWRFetch<{ exhibitors: Exhibitor[]; categories: string[]; myParticipantId: string | null }>(
    `/api/events/${eventId}/exhibitors?${queryParams}`,
    { keepPreviousData: true }
  );

  useRealtime({
    table: "companies",
    filter: { event_id: eventId },
    onChanged: () => mutate(),
  });

  const exhibitors = exhibitorData?.exhibitors || [];
  const categories = exhibitorData?.categories || [];
  const myParticipantId = exhibitorData?.myParticipantId ?? null;

  // Track which exhibitors we've already captured a lead for (per page session)
  const capturedLeads = useRef<Set<string>>(new Set());

  // Auto-capture lead when a participant opens an exhibitor's detail
  useEffect(() => {
    if (!selected || !myParticipantId) return;
    if (capturedLeads.current.has(selected.id)) return;
    capturedLeads.current.add(selected.id);

    fetch(`/api/companies/${selected.id}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        participant_id: myParticipantId,
        source: "profile_view",
      }),
    }).catch(() => {/* non-fatal */});
  }, [selected, myParticipantId, eventId]);

  async function openMemberPanel(member: TeamMember) {
    if (!member.participant_id) return;
    setSelectedTeamMember(member);
    setMemberDetail(null);
    setMemberDetailLoading(true);
    try {
      const res = await fetch(`/api/participants/${member.participant_id}`);
      if (res.ok) {
        const { participant } = await res.json();
        setMemberDetail(participant);
      }
    } catch {
      // Show panel with basic info only
    } finally {
      setMemberDetailLoading(false);
    }
  }

  function closeMemberPanel() {
    setSelectedTeamMember(null);
    setMemberDetail(null);
  }

  function openMeetingFromPanel() {
    if (!selectedTeamMember) return;
    const member = selectedTeamMember;
    closeMemberPanel();
    setMeetingTarget(member);
    setMeetingNote("");
    setSelectedSlot(null);
    setMeetingType("in-person");
  }

  async function requestMeeting(member: TeamMember) {
    if (!member.participant_id) return;
    setMeetingLoading(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          recipientParticipantId: member.participant_id,
          agendaNote: meetingNote || null,
          meetingType,
          startTime: selectedSlot ? `${selectedSlot.date}T${selectedSlot.startTime}:00Z` : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to send request");
        return;
      }
      setMeetingTarget(null);
      setMeetingNote("");
      setSelectedSlot(null);
      setMeetingType("in-person");
      alert(`Meeting request sent to ${member.name}!`);
    } catch {
      alert("Something went wrong.");
    } finally {
      setMeetingLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Detail view
  if (selected) {
    const ep = Array.isArray(selected.exhibitor_profiles) ? (selected.exhibitor_profiles as any)[0] : selected.exhibitor_profiles;
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <button onClick={() => setSelected(null)} className="text-caption text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to exhibitors
        </button>

        {selected.banner_url && (
          <div className="rounded-xl overflow-hidden mb-6 h-48">
            <SafeImage src={selected.banner_url} alt="" className="w-full h-full object-cover" width={800} height={400} />
          </div>
        )}

        <div className="flex items-start gap-4 mb-6">
          {selected.logo_url ? (
            <SafeImage src={selected.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0 border" width={64} height={64} />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary text-h2 font-bold shrink-0">
              {selected.name[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-h1 font-semibold">{selected.name}</h1>
            {selected.description_short && (
              <p className="text-body text-muted-foreground mt-1">{selected.description_short}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {selected.industry && <Badge variant="outline" className="text-[10px]">{selected.industry}</Badge>}
              {ep?.booth_number && (
                <span className="text-caption text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Booth {ep.booth_number}
                </span>
              )}
              {ep?.booth_type && <Badge variant="secondary" className="text-[10px]">{ep.booth_type}</Badge>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8 flex-wrap">
          {selected.website && (
            <a href={selected.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Globe className="mr-2 h-4 w-4" /> Website</Button>
            </a>
          )}
        </div>

        {/* Team members */}
        {selected.team && selected.team.length > 0 && (
          <div className="mb-6">
            <h2 className="text-body font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Team
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {selected.team.map((member) => (
                <Card
                  key={member.id}
                  className={`transition-all ${member.participant_id ? "cursor-pointer hover:shadow-md hover:border-border-strong" : ""}`}
                  onClick={() => member.participant_id && openMemberPanel(member)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <SafeImage src={member.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" width={40} height={40} />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-body font-semibold shrink-0">
                          {member.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-body font-medium truncate">{member.name}</p>
                          {member.role === "admin" && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                        </div>
                        {member.title && <p className="text-caption text-muted-foreground truncate">{member.title}</p>}
                      </div>
                      {member.participant_id && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {selected.description_long && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h2 className="text-body font-semibold mb-2">About</h2>
              <div className="text-body text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.description_long }} />
            </CardContent>
          </Card>
        )}

        {/* Products */}
        {ep?.products && ep.products.length > 0 && (
          <div className="mb-6">
            <h2 className="text-body font-semibold mb-3">Products & Services</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {ep.products.map((product: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <div className="flex gap-3">
                      {product.image_url && (
                        <SafeImage src={product.image_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" width={64} height={64} />
                      )}
                      <div>
                        <p className="text-body font-medium">{product.name}</p>
                        {product.description && <p className="text-caption text-muted-foreground mt-0.5">{product.description}</p>}
                        {product.price_info && <Badge variant="secondary" className="text-[10px] mt-1">{product.price_info}</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {ep?.resources && ep.resources.length > 0 && (
          <div className="mb-6">
            <h2 className="text-body font-semibold mb-3">Resources</h2>
            <div className="space-y-2">
              {ep.resources.map((res: any, i: number) => (
                <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors">
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium truncate">{res.name}</p>
                    <p className="text-caption text-muted-foreground">{res.type}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Product categories */}
        {ep?.product_categories && ep.product_categories.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {ep.product_categories.map((cat: string) => (
              <Badge key={cat} variant="outline" className="text-[10px]"><Tag className="mr-1 h-2.5 w-2.5" />{cat}</Badge>
            ))}
          </div>
        )}

        {/* Team member participant panel */}
        {selectedTeamMember && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={closeMemberPanel} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl animate-slide-in-right overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {(memberDetail?.profiles.avatar_url ?? selectedTeamMember.avatar_url) ? (
                      <SafeImage
                        src={(memberDetail?.profiles.avatar_url ?? selectedTeamMember.avatar_url)!}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover shrink-0"
                        width={64}
                        height={64}
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-h3 font-semibold shrink-0">
                        {selectedTeamMember.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-h3 font-semibold">
                          {memberDetail?.profiles.full_name ?? selectedTeamMember.name}
                        </h2>
                        {selectedTeamMember.role === "admin" && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-caption text-muted-foreground">
                        {memberDetail
                          ? [memberDetail.profiles.title, memberDetail.profiles.company_name].filter(Boolean).join(" at ")
                          : selectedTeamMember.title ?? ""}
                      </p>
                    </div>
                  </div>
                  <button onClick={closeMemberPanel} className="p-2 rounded hover:bg-secondary shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {memberDetailLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!memberDetailLoading && memberDetail && (
                  <>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {memberDetail.role && memberDetail.role !== "participant" && (
                        <Badge variant="secondary" className="capitalize">{memberDetail.role}</Badge>
                      )}
                      {memberDetail.profiles.industry && (
                        <Badge variant="outline">
                          <Building2 className="mr-1 h-3 w-3" />
                          {memberDetail.profiles.industry}
                        </Badge>
                      )}
                      {memberDetail.profiles.company_size && (
                        <Badge variant="outline">
                          <Users className="mr-1 h-3 w-3" />
                          {memberDetail.profiles.company_size}
                        </Badge>
                      )}
                      {memberDetail.intent && (
                        <Badge variant="outline">
                          <Tag className="mr-1 h-3 w-3" />
                          {INTENT_LABELS[memberDetail.intent] || memberDetail.intent}
                        </Badge>
                      )}
                    </div>

                    {/* Bio */}
                    {memberDetail.profiles.bio && (
                      <div className="mb-6">
                        <h3 className="text-caption font-semibold mb-2">About</h3>
                        <p className="text-body text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {memberDetail.profiles.bio}
                        </p>
                      </div>
                    )}

                    {/* Looking for / Offering */}
                    {(memberDetail.looking_for || memberDetail.offering) && (
                      <div className="mb-6">
                        <h3 className="text-caption font-semibold mb-2">What they&apos;re about</h3>
                        <div className="space-y-2">
                          {memberDetail.looking_for && (
                            <div className="flex items-start gap-2 text-caption text-muted-foreground">
                              <Search className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
                              <span>
                                <span className="font-medium text-foreground">Looking for:</span>{" "}
                                {trimAiPrefix(memberDetail.looking_for)}
                              </span>
                            </div>
                          )}
                          {memberDetail.offering && (
                            <div className="flex items-start gap-2 text-caption text-muted-foreground">
                              <Briefcase className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500/80" />
                              <span>
                                <span className="font-medium text-foreground">Offering:</span>{" "}
                                {trimAiPrefix(memberDetail.offering)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="mb-6">
                      <h3 className="text-caption font-semibold mb-2">Contact</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-caption text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span>{memberDetail.profiles.email}</span>
                        </div>
                        {memberDetail.profiles.company_name && (
                          <div className="flex items-center gap-2 text-caption text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{memberDetail.profiles.company_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expertise */}
                    {memberDetail.profiles.expertise_areas?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-caption font-semibold mb-2">Expertise</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {memberDetail.profiles.expertise_areas.map((area) => (
                            <span
                              key={area}
                              className="text-small bg-secondary text-foreground rounded-full px-2.5 py-1"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      closeMemberPanel();
                      router.push(`/dashboard/events/${eventId}/messages?to=${selectedTeamMember.user_id}`);
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                  {selectedTeamMember.participant_id && (
                    <Button className="flex-1" onClick={openMeetingFromPanel}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Request meeting
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Meeting request modal */}
        {meetingTarget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setMeetingTarget(null)}>
            <div className="w-full max-w-sm rounded-xl bg-card border border-border p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-body font-semibold">Request a meeting</h3>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    with <span className="font-medium text-foreground">{meetingTarget.name}</span>
                  </p>
                </div>
                <button onClick={() => setMeetingTarget(null)} className="p-1.5 rounded hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Slot picker */}
              {meetingTarget.participant_id && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-caption font-medium">Pick a time</label>
                    {selectedSlot && (
                      <button
                        type="button"
                        onClick={() => setSelectedSlot(null)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <MeetingSlotPicker
                    eventId={eventId}
                    recipientParticipantId={meetingTarget.participant_id}
                    selected={selectedSlot}
                    onSelect={setSelectedSlot}
                  />
                  {selectedSlot && (
                    <p className="mt-2 text-[11px] text-primary font-medium">
                      ✓ Requesting{" "}
                      {new Date(`${selectedSlot.date}T12:00:00`).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at {fmtTime(selectedSlot.startTime)} – {fmtTime(selectedSlot.endTime)}
                      {!selectedSlot.iAmFree && (
                        <span className="ml-1.5 text-warning font-normal">(you&apos;re busy at this time)</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Meeting type */}
              <div className="mb-4">
                <label className="text-caption font-medium block mb-1.5">Meeting type</label>
                <div className="flex gap-2">
                  {["in-person", "virtual", "hybrid"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setMeetingType(type)}
                      className={`rounded-full border px-3 py-1.5 text-caption capitalize transition-all ${
                        meetingType === type
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-border-strong"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={meetingNote}
                onChange={(e) => setMeetingNote(e.target.value)}
                placeholder="Add a note (optional)..."
                rows={3}
                className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none mb-4"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setMeetingTarget(null)}>Cancel</Button>
                <Button className="flex-1" onClick={() => requestMeeting(meetingTarget)} disabled={meetingLoading}>
                  {meetingLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="mr-2 h-4 w-4" />
                  )}
                  {selectedSlot ? "Send request" : "Send without time"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Exhibitor list
  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-h1 font-semibold tracking-tight">Exhibitors</h1>
        <p className="mt-1 text-body text-muted-foreground">
          {exhibitors.length} exhibitor{exhibitors.length !== 1 ? "s" : ""} at this event
        </p>
      </div>

      {/* Search and filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exhibitors..."
            className="pl-10"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
          >
            <option value="">All categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        )}
      </div>

      {exhibitors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">No exhibitors found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {exhibitors.map((exhibitor) => {
            const ep = Array.isArray(exhibitor.exhibitor_profiles) ? exhibitor.exhibitor_profiles[0] : exhibitor.exhibitor_profiles;
            return (
              <Card
                key={exhibitor.id}
                className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all"
                onClick={() => setSelected(exhibitor)}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    {exhibitor.logo_url ? (
                      <SafeImage src={exhibitor.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0 border" width={48} height={48} />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary text-body font-bold shrink-0">
                        {exhibitor.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold truncate group-hover:text-primary transition-colors">{exhibitor.name}</p>
                      {exhibitor.description_short && (
                        <p className="text-caption text-muted-foreground mt-0.5 line-clamp-2">{exhibitor.description_short}</p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {exhibitor.industry && <Badge variant="outline" className="text-[9px]">{exhibitor.industry}</Badge>}
                        {ep?.booth_number && <Badge variant="secondary" className="text-[9px]">Booth {ep.booth_number}</Badge>}
                        {(exhibitor.team?.length ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-[9px]">
                            <Users className="mr-1 h-2.5 w-2.5" />{exhibitor.team.length} rep{exhibitor.team.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-1" />
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
