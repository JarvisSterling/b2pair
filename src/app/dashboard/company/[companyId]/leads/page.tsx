"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSWRFetch } from "@/hooks/use-swr-fetch";
import { useRealtime } from "@/hooks/use-realtime";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Target,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Mail,
} from "lucide-react";

interface Lead {
  id: string;
  source: string;
  qualification: string | null;
  notes: string | null;
  tags: string[];
  resource_accessed: string | null;
  created_at: string;
  participant: any;
}

export default function CompanyLeadsPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { data: leadsData, isLoading: loading, mutate } = useSWRFetch<{ leads: Lead[] }>(`/api/companies/${companyId}/leads`);
  const leads = leadsData?.leads || [];
  const [search, setSearch] = useState("");
  const [filterQual, setFilterQual] = useState<string | null>(null);

  // Real-time: refresh when leads change for this company
  useRealtime({
    table: "company_leads",
    filter: { company_id: companyId },
    onChanged: () => mutate(),
  });

  async function updateLead(leadId: string, updates: Record<string, unknown>) {
    await fetch(`/api/companies/${companyId}/leads`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, ...updates }),
    });
    mutate();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const filtered = leads.filter((lead) => {
    const name = lead.participant?.user?.raw_user_meta_data?.full_name || lead.participant?.user?.email || "";
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchesQual = !filterQual || lead.qualification === filterQual;
    return matchesSearch && matchesQual;
  });

  const qualCounts = {
    hot: leads.filter((l) => l.qualification === "hot").length,
    warm: leads.filter((l) => l.qualification === "warm").length,
    cold: leads.filter((l) => l.qualification === "cold").length,
    unqualified: leads.filter((l) => !l.qualification).length,
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/company/${companyId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-h1 font-semibold tracking-tight">Leads</h1>
          <p className="text-caption text-muted-foreground">{leads.length} total lead{leads.length !== 1 ? "s" : ""} captured</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        {[
          { label: "Hot", count: qualCounts.hot, color: "text-red-500", bg: "bg-red-500/10", key: "hot" },
          { label: "Warm", count: qualCounts.warm, color: "text-amber-500", bg: "bg-amber-500/10", key: "warm" },
          { label: "Cold", count: qualCounts.cold, color: "text-blue-500", bg: "bg-blue-500/10", key: "cold" },
          { label: "Unqualified", count: qualCounts.unqualified, color: "text-muted-foreground", bg: "bg-muted", key: null as string | null },
        ].map((q) => (
          <button
            key={q.label}
            onClick={() => setFilterQual(filterQual === q.key ? null : q.key)}
            className="text-left"
          >
            <Card className={`transition-all ${filterQual === q.key ? "ring-2 ring-primary/30 border-primary" : "hover:border-border-strong"}`}>
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${q.bg}`} />
                  <span className="text-caption font-medium">{q.label}</span>
                  <span className={`text-h3 font-semibold ml-auto ${q.color}`}>{q.count}</span>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="pl-10"
        />
      </div>

      {/* Leads list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {leads.length === 0 ? "No leads captured yet." : "No leads match your filters."}
            </p>
            {leads.length === 0 && (
              <p className="text-caption text-muted-foreground mt-1">Leads are automatically captured when attendees view your profile or download resources.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const name = lead.participant?.user?.raw_user_meta_data?.full_name || lead.participant?.user?.email || "Unknown";
            const email = lead.participant?.user?.email || "";
            const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Card key={lead.id} className="group">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-medium truncate">{name}</p>
                        {lead.qualification && (
                          <Badge variant={lead.qualification === "hot" ? "destructive" : lead.qualification === "warm" ? "default" : "secondary"} className="text-[9px]">
                            {lead.qualification}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        {email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {email}
                          </span>
                        )}
                        <span>· {lead.source.replace("_", " ")}</span>
                        {lead.resource_accessed && <span>· {lead.resource_accessed}</span>}
                        <span>· {new Date(lead.created_at).toLocaleDateString()}</span>
                      </div>
                      {lead.notes && <p className="text-caption text-muted-foreground mt-1 italic">&ldquo;{lead.notes}&rdquo;</p>}
                      {lead.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {lead.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {["hot", "warm", "cold"].map((q) => (
                        <button
                          key={q}
                          onClick={() => updateLead(lead.id, { qualification: lead.qualification === q ? null : q })}
                          className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                            lead.qualification === q
                              ? q === "hot" ? "bg-red-500/20 text-red-500" : q === "warm" ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500"
                              : "bg-muted text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
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
