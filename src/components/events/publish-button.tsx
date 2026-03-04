"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, EyeOff, Loader2 } from "lucide-react";

export function PublishEventButton({ eventId, currentStatus }: { eventId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (currentStatus !== "draft" && currentStatus !== "published") return null;

  async function handlePublish() {
    if (!confirm("Publish this event? It will be visible to participants.")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("events").update({ status: "published" }).eq("id", eventId);
    router.refresh();
    setLoading(false);
  }

  async function handleUnpublish() {
    if (!confirm("Unpublish this event? It will be hidden from participants and registration will stop.")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("events").update({ status: "draft" }).eq("id", eventId);
    router.refresh();
    setLoading(false);
  }

  if (currentStatus === "published") {
    return (
      <Button variant="outline" size="sm" onClick={handleUnpublish} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <EyeOff className="mr-2 h-4 w-4" />}
        Unpublish
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handlePublish} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
      Publish
    </Button>
  );
}
