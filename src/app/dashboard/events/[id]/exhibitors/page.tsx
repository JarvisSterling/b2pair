"use client";

import { useCallback, useEffect, useState } from "react";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Globe,
  Loader2,
  FileText,
  Download,
  ExternalLink,
  ShoppingBag,
  Crown,
} from "lucide-react";

interface Tier {
  id: string;
  name: string;
  color: string;
}

interface Sponsor {
  id: string;
  tier_id: string | null;
  company_name: string;
  logo_url: string | null;
}

interface Booth {
  id: string;
  sponsor_id: string | null;
  company_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  is_published: boolean;
  booth_products: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    price: string | null;
    category: string | null;
  }[];
  booth_documents: {
    id: string;
    name: string;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
  }[];
}

export default function ExhibitorsPage() {
  const eventId = useEventId();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/sponsors?eventId=${eventId}`);
    const data = await res.json();
    setTiers(data.tiers || []);
    setSponsors(data.sponsors || []);
    setBooths((data.booths || []).filter((b: Booth) => b.is_published));
    setLoading(false);
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function logVisit(boothId: string) {
    await fetch("/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "visit", booth_id: boothId }),
    });
  }

  function openBooth(booth: Booth) {
    setSelectedBooth(booth);
    logVisit(booth.id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show booth detail
  if (selectedBooth) {
    const sponsor = sponsors.find((s) => s.id === selectedBooth.sponsor_id);
    const tier = sponsor ? tiers.find((t) => t.id === sponsor.tier_id) : null;

    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <button
          onClick={() => setSelectedBooth(null)}
          className="text-caption text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
        >
          ← Back to exhibitors
        </button>

        {selectedBooth.banner_url && (
          <div className="rounded-xl overflow-hidden mb-6 h-48">
            <img src={selectedBooth.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-start gap-4 mb-6">
          {selectedBooth.logo_url ? (
            <img src={selectedBooth.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary text-h2 font-bold shrink-0">
              {selectedBooth.company_name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-h1 font-semibold">{selectedBooth.company_name}</h1>
              {tier && (
                <Badge variant="outline" style={{ borderColor: tier.color, color: tier.color }}>
                  <Crown className="mr-1 h-3 w-3" />
                  {tier.name}
                </Badge>
              )}
            </div>
            {selectedBooth.tagline && (
              <p className="text-body text-muted-foreground mt-1">{selectedBooth.tagline}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          {selectedBooth.website_url && (
            <a href={selectedBooth.website_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Globe className="mr-2 h-4 w-4" />
                Website
              </Button>
            </a>
          )}
          {selectedBooth.cta_url && (
            <a href={selectedBooth.cta_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                {selectedBooth.cta_label || "Contact Us"}
              </Button>
            </a>
          )}
        </div>

        {selectedBooth.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h2 className="text-body font-semibold mb-2">About</h2>
              <p className="text-body text-muted-foreground whitespace-pre-wrap">{selectedBooth.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Products */}
        {selectedBooth.booth_products.length > 0 && (
          <div className="mb-6">
            <h2 className="text-body font-semibold mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              Products & Services
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedBooth.booth_products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="pt-5">
                    <div className="flex gap-3">
                      {product.image_url && (
                        <img src={product.image_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                      )}
                      <div>
                        <p className="text-body font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-caption text-muted-foreground mt-0.5">{product.description}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {product.price && <Badge variant="secondary" className="text-[10px]">{product.price}</Badge>}
                          {product.category && <Badge variant="outline" className="text-[10px]">{product.category}</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {selectedBooth.booth_documents.length > 0 && (
          <div className="mb-6">
            <h2 className="text-body font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Documents
            </h2>
            <div className="space-y-2">
              {selectedBooth.booth_documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium truncate">{doc.name}</p>
                    {doc.file_size && (
                      <p className="text-caption text-muted-foreground">
                        {(doc.file_size / 1024).toFixed(0)}KB
                      </p>
                    )}
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Booth directory
  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-h1 font-semibold tracking-tight">Exhibitors</h1>
        <p className="mt-1 text-body text-muted-foreground">
          {booths.length} exhibitor{booths.length !== 1 ? "s" : ""} at this event
        </p>
      </div>

      {/* Sponsor logos by tier */}
      {tiers.length > 0 && sponsors.length > 0 && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-body font-semibold mb-4">Sponsors</h2>
            {tiers.map((tier) => {
              const tierSponsors = sponsors.filter((s) => s.tier_id === tier.id);
              if (tierSponsors.length === 0) return null;
              return (
                <div key={tier.id} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                    <span className="text-caption font-medium text-muted-foreground">{tier.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {tierSponsors.map((sponsor) => (
                      <div key={sponsor.id} className="flex items-center gap-2">
                        {sponsor.logo_url ? (
                          <img src={sponsor.logo_url} alt={sponsor.company_name} className="h-8 rounded object-contain" />
                        ) : (
                          <span className="text-caption font-medium">{sponsor.company_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {booths.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">No exhibitors yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {booths.map((booth) => {
            const sponsor = sponsors.find((s) => s.id === booth.sponsor_id);
            const tier = sponsor ? tiers.find((t) => t.id === sponsor.tier_id) : null;

            return (
              <Card
                key={booth.id}
                className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all"
                onClick={() => openBooth(booth)}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    {booth.logo_url ? (
                      <img src={booth.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary text-body font-bold shrink-0">
                        {booth.company_name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-semibold truncate">{booth.company_name}</p>
                        {tier && (
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                        )}
                      </div>
                      {booth.tagline && (
                        <p className="text-caption text-muted-foreground mt-0.5 line-clamp-2">{booth.tagline}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {booth.booth_products.length > 0 && (
                          <span className="text-small text-muted-foreground">{booth.booth_products.length} products</span>
                        )}
                        {booth.booth_documents.length > 0 && (
                          <span className="text-small text-muted-foreground">{booth.booth_documents.length} docs</span>
                        )}
                      </div>
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
