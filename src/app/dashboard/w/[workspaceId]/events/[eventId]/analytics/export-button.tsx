"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export function ExportButton({ eventId }: { eventId: string }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const supabase = createClient();

    // Fetch participants with profiles
    const { data: participants } = await supabase
      .from("participants")
      .select(`
        id, role, intent, status, created_at,
        profiles!inner(full_name, email, title, company_name, industry)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (!participants?.length) {
      setExporting(false);
      return;
    }

    // Build CSV
    const headers = ["Name", "Email", "Title", "Company", "Industry", "Role", "Intent", "Status", "Registered"];
    const rows = participants.map((p: any) => [
      p.profiles.full_name,
      p.profiles.email,
      p.profiles.title || "",
      p.profiles.company_name || "",
      p.profiles.industry || "",
      p.role || "",
      p.intent || "",
      p.status,
      new Date(p.created_at).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${eventId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting}>
      {exporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
