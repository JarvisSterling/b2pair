export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyTracker, TrackCtaClick, TrackDownload } from "@/components/events/company-tracker";
import { Crown, Globe, Download, ExternalLink, MessageSquare, Calendar } from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";

interface PageProps {
  params: Promise<{ slug: string; companySlug: string }>;
}

export default async function SponsorProfilePage({ params }: PageProps) {
  const { slug, companySlug } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  const { data: company } = await admin
    .from("companies")
    .select(`
      *,
      sponsor_profiles(*, tier:sponsor_tiers(*)),
      company_members(id, name, role, user_id, invite_status)
    `)
    .eq("event_id", event.id)
    .eq("slug", companySlug)
    .eq("status", "live")
    .contains("capabilities", ["sponsor"])
    .single();

  if (!company) notFound();

  const sp = Array.isArray(company.sponsor_profiles) ? company.sponsor_profiles[0] : company.sponsor_profiles;
  const tier = sp?.tier;

  // Only show accepted members who have an account
  const members = (company.company_members || []).filter(
    (m: any) => m.invite_status === "accepted" && m.user_id
  );

  // Get member profiles + participant IDs for messaging links
  const memberUserIds = members.map((m: any) => m.user_id);
  let profiles: any[] = [];
  let participantMap: Record<string, string> = {}; // user_id → participant.id

  if (memberUserIds.length > 0) {
    const [profilesRes, participantsRes] = await Promise.all([
      admin.from("profiles").select("id, full_name, avatar_url, title").in("id", memberUserIds),
      admin.from("participants").select("id, user_id").eq("event_id", event.id).in("user_id", memberUserIds),
    ]);
    profiles = profilesRes.data || [];
    for (const p of participantsRes.data || []) {
      participantMap[p.user_id] = p.id;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <CompanyTracker companyId={company.id} eventId={event.id} type="profile_view" />
      <Link href={`/events/${slug}/sponsors`} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
        ← All Sponsors
      </Link>

      {/* Banner */}
      {company.banner_url && (
        <div className="rounded-xl overflow-hidden mb-6 h-48">
          <SafeImage src={company.banner_url} alt="" className="w-full h-full object-cover" width={800} height={400} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {company.logo_url ? (
          <SafeImage src={company.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" width={64} height={64} />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {company.name[0]}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {tier && (
              <Badge variant="outline" style={{ borderColor: tier.color, color: tier.color }}>
                <Crown className="mr-1 h-3 w-3" />
                {tier.name}
              </Badge>
            )}
          </div>
          {sp?.tagline && <p className="text-muted-foreground mt-1">{sp.tagline}</p>}
          {company.industry && (
            <p className="text-sm text-muted-foreground mt-1">
              {company.industry}{company.hq_location ? ` · ${company.hq_location}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* CTA Buttons — always show website if available */}
      {(company.website || sp?.cta_buttons?.length > 0) && (
        <div className="flex gap-3 mb-8 flex-wrap">
          {company.website && (
            <TrackCtaClick companyId={company.id} eventId={event.id} ctaLabel="Website">
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Globe className="mr-2 h-4 w-4" /> Website
                </Button>
              </a>
            </TrackCtaClick>
          )}
          {sp?.cta_buttons?.map((cta: any, i: number) => (
            <TrackCtaClick key={i} companyId={company.id} eventId={event.id} ctaLabel={cta.label}>
              <a href={cta.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant={cta.style === "outline" ? "outline" : cta.style === "secondary" ? "secondary" : "default"}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {cta.label}
                </Button>
              </a>
            </TrackCtaClick>
          ))}
        </div>
      )}

      {/* Description */}
      {company.description_long ? (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3">About</h2>
          <div className="prose max-w-none text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: company.description_long }} />
        </div>
      ) : company.description_short ? (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3">About</h2>
          <p className="text-sm text-muted-foreground">{company.description_short}</p>
        </div>
      ) : null}

      {/* Promo Video */}
      {sp?.promo_video_url && (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3">Video</h2>
          <div className="aspect-video rounded-lg overflow-hidden">
            <iframe
              src={getVideoEmbed(sp.promo_video_url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Downloadables */}
      {sp?.downloadables?.length > 0 && (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3">Resources</h2>
          <div className="space-y-2">
            {sp.downloadables.map((dl: any, i: number) => (
              <TrackDownload key={i} companyId={company.id} eventId={event.id} resourceName={dl.name}>
                <a
                  href={dl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <Download className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{dl.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{dl.type}</p>
                  </div>
                </a>
              </TrackDownload>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      {sp?.sessions?.length > 0 && (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3">Sessions & Speaking</h2>
          <div className="space-y-3">
            {sp.sessions.map((session: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/30">
                <p className="font-medium text-sm">{session.title}</p>
                {session.speaker_name && <p className="text-xs text-muted-foreground mt-1">Speaker: {session.speaker_name}</p>}
                {session.description && <p className="text-xs text-muted-foreground mt-1">{session.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      {members.length > 0 && (
        <div className="rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Team</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member: any) => {
              const profile = profiles.find((p: any) => p.id === member.user_id);
              const name = profile?.full_name || member.name || "Team Member";
              const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              const participantId = participantMap[member.user_id];
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/40 transition-colors">
                  {profile?.avatar_url ? (
                    <SafeImage src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" width={40} height={40} />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.title || member.role}</p>
                  </div>
                  {participantId && (
                    <div className="flex gap-1 shrink-0">
                      <Link href={`/dashboard/events/${event.id}/messages?to=${participantId}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/events/${event.id}/meetings?request=${participantId}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          <Calendar className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getVideoEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.split("/").pop()}`;
    return url;
  } catch { return url; }
}
