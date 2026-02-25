export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Crown } from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SponsorsDirectoryPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  const { data: tiers } = await admin
    .from("sponsor_tiers")
    .select("*")
    .eq("event_id", event.id)
    .order("rank");

  const { data: companies } = await admin
    .from("companies")
    .select("id, name, slug, logo_url, banner_url, description_short, sponsor_profiles(*)")
    .eq("event_id", event.id)
    .eq("status", "live")
    .contains("capabilities", ["sponsor"]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <Link href={`/events/${slug}`} className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to {event.name}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Sponsors</h1>
        <p className="text-muted-foreground mt-1">{(companies || []).length} sponsors at this event</p>
      </div>

      {(tiers || []).map((tier) => {
        const tierSponsors = (companies || []).filter((c: any) => {
          const sp = Array.isArray(c.sponsor_profiles) ? c.sponsor_profiles[0] : c.sponsor_profiles;
          return sp?.tier_id === tier.id;
        });
        if (!tierSponsors.length) return null;

        return (
          <div key={tier.id} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
              <h2 className="text-lg font-semibold">{tier.name}</h2>
              <span className="text-xs text-muted-foreground">({tierSponsors.length})</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {tierSponsors.map((company: any) => {
                const sp = Array.isArray(company.sponsor_profiles) ? company.sponsor_profiles[0] : company.sponsor_profiles;
                return (
                  <Link
                    key={company.id}
                    href={`/events/${slug}/sponsors/${company.slug}`}
                    className="group block rounded-xl border p-5 hover:shadow-md hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {company.logo_url ? (
                        <SafeImage src={company.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" width={48} height={48} />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {company.name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">{company.name}</p>
                        {sp?.tagline && <p className="text-sm text-muted-foreground truncate">{sp.tagline}</p>}
                      </div>
                    </div>
                    {company.description_short && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{company.description_short}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Untiered sponsors */}
      {(() => {
        const untiered = (companies || []).filter((c: any) => {
          const sp = Array.isArray(c.sponsor_profiles) ? c.sponsor_profiles[0] : c.sponsor_profiles;
          return !sp?.tier_id;
        });
        if (!untiered.length) return null;
        return (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4">Other Sponsors</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {untiered.map((company: any) => (
                <Link
                  key={company.id}
                  href={`/events/${slug}/sponsors/${company.slug}`}
                  className="group block rounded-xl border p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    {company.logo_url ? (
                      <SafeImage src={company.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" width={48} height={48} />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {company.name[0]}
                      </div>
                    )}
                    <p className="font-medium truncate group-hover:text-primary transition-colors">{company.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
