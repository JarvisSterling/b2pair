export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Download, ShoppingBag, FileText, ExternalLink, Play, Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string; companySlug: string }>;
}

export default async function ExhibitorBoothPage({ params }: PageProps) {
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
      exhibitor_profiles(*),
      company_members(id, name, role, participant_id, user_id)
    `)
    .eq("event_id", event.id)
    .eq("slug", companySlug)
    .eq("status", "live")
    .contains("capabilities", ["exhibitor"])
    .single();

  if (!company) notFound();

  const ep = Array.isArray(company.exhibitor_profiles) ? company.exhibitor_profiles[0] : company.exhibitor_profiles;
  const members = (company.company_members || []).filter((m: any) => m.participant_id);

  // Get member profiles
  const memberIds = members.map((m: any) => m.user_id).filter(Boolean);
  let profiles: any[] = [];
  if (memberIds.length > 0) {
    const { data } = await admin.from("profiles").select("id, full_name, avatar_url, title").in("id", memberIds);
    profiles = data || [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href={`/events/${slug}/exhibitors`} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
        ← All Exhibitors
      </Link>

      {/* Banner */}
      {company.banner_url && (
        <div className="rounded-xl overflow-hidden mb-6 h-48">
          <img src={company.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {company.logo_url ? (
          <img src={company.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {company.name[0]}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {ep?.booth_number && (
              <Badge variant="outline">Booth {ep.booth_number}</Badge>
            )}
          </div>
          {company.description_short && <p className="text-muted-foreground mt-1">{company.description_short}</p>}
          <div className="flex gap-2 mt-2">
            {ep?.booth_type && <Badge variant="secondary" className="text-xs">{ep.booth_type}</Badge>}
            {ep?.product_categories?.map((cat: string) => (
              <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {company.website && (
          <a href={company.website} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><Globe className="mr-2 h-4 w-4" /> Website</Button>
          </a>
        )}
        <Button size="sm"><Calendar className="mr-2 h-4 w-4" /> Book Meeting</Button>
        <Button size="sm" variant="secondary"><MessageSquare className="mr-2 h-4 w-4" /> Request Demo</Button>
      </div>

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

      {/* Products */}
      {ep?.products?.length > 0 && (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            Products & Services
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ep.products.map((product: any, i: number) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="flex gap-3">
                  {product.image_url && (
                    <img src={product.image_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    {product.description && <p className="text-xs text-muted-foreground mt-1">{product.description}</p>}
                    <div className="flex gap-2 mt-2">
                      {product.price_info && <Badge variant="secondary" className="text-[10px]">{product.price_info}</Badge>}
                      {product.demo_url && (
                        <a href={product.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                          <Play className="h-3 w-3" /> Demo
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {ep?.resources?.length > 0 && (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Resources
          </h2>
          <div className="space-y-2">
            {ep.resources.map((res: any, i: number) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <Download className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{res.name}</p>
                  <p className="text-xs text-muted-foreground uppercase">{res.type}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {members.length > 0 && (
        <div className="rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Team at Booth</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member: any) => {
              const profile = profiles.find((p: any) => p.id === member.user_id);
              const name = profile?.full_name || member.name || "Team Member";
              const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.title || member.role}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto text-xs">
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
