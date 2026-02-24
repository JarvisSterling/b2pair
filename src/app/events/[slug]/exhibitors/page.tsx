"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ExhibitorsDirectoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [eventId, setEventId] = useState<string | null>(null);
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    async function resolveEvent() {
      const supabase = createClient();
      const { data } = await supabase.from("events").select("id").eq("slug", slug).single();
      if (data) setEventId(data.id);
    }
    resolveEvent();
  }, [slug]);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const res = await fetch(`/api/events/${eventId}/exhibitors?${params}`);
    const data = await res.json();
    setExhibitors(data.exhibitors || []);
    setCategories(data.categories || []);
    setLoading(false);
  }, [eventId, search, category]);

  useEffect(() => { if (eventId) loadData(); }, [eventId, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <Link href={`/events/${slug}`} className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to event
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Exhibitors</h1>
        <p className="text-muted-foreground mt-1">{exhibitors.length} exhibitor{exhibitors.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search exhibitors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded bg-input px-3 text-sm border border-border"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {exhibitors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{search ? "No exhibitors match your search." : "No exhibitors yet."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {exhibitors.map((ex: any) => {
            const ep = Array.isArray(ex.exhibitor_profiles) ? ex.exhibitor_profiles[0] : ex.exhibitor_profiles;
            return (
              <Link
                key={ex.id}
                href={`/events/${slug}/exhibitors/${ex.slug}`}
                className="group block"
              >
                <Card className="h-full hover:shadow-md hover:border-primary/20 transition-all">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3 mb-2">
                      {ex.logo_url ? (
                        <img src={ex.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {ex.name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">{ex.name}</p>
                        <div className="flex gap-2 mt-1">
                          {ep?.booth_number && <Badge variant="outline" className="text-[10px]">Booth {ep.booth_number}</Badge>}
                          {ep?.booth_type && <Badge variant="secondary" className="text-[10px]">{ep.booth_type}</Badge>}
                        </div>
                      </div>
                    </div>
                    {ex.description_short && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{ex.description_short}</p>
                    )}
                    {ep?.product_categories?.length > 0 && (
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {ep.product_categories.slice(0, 3).map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-[9px]">{cat}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
