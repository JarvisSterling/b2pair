"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Globe,
  Loader2,
  ExternalLink,
  Search,
  ArrowLeft,
  MapPin,
  Tag,
} from "lucide-react";

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
  exhibitor_profiles: {
    booth_number: string | null;
    booth_type: string | null;
    product_categories: string[];
    products: { name: string; description: string | null; image_url: string | null; price_info: string | null }[];
    resources: { name: string; url: string; type: string }[];
  } | null;
}

export default function ParticipantExhibitorsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Exhibitor | null>(null);

  const loadData = useCallback(async () => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.set("search", search);
    if (category) queryParams.set("category", category);
    const res = await fetch(`/api/events/${eventId}/exhibitors?${queryParams}`);
    const data = await res.json();
    setExhibitors(data.exhibitors || []);
    setCategories(data.categories || []);
    setLoading(false);
  }, [eventId, search, category]);

  useEffect(() => { loadData(); }, [loadData]);

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
            <img src={selected.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-start gap-4 mb-6">
          {selected.logo_url ? (
            <img src={selected.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0 border" />
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

        <div className="flex gap-3 mb-8">
          {selected.website && (
            <a href={selected.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Globe className="mr-2 h-4 w-4" /> Website</Button>
            </a>
          )}
        </div>

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
                        <img src={product.image_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
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
      </div>
    );
  }

  // Directory
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
                      <img src={exhibitor.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0 border" />
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
