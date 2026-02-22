"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, Loader2 } from "lucide-react";

export function PublishEventButton({ eventId, currentStatus }: { eventId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (currentStatus !== "draft") return null;

  async function handlePublish() {
    if (!confirm("Publish this event? It will be visible to participants.")) return;
    setLoading(true);

    const supabase = createClient();
    await supabase
      .from("events")
      .update({ status: "published" })
      .eq("id", eventId);

    router.refresh();
    setLoading(false);
  }

  return (
    <Button size="sm" onClick={handlePublish} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
      Publish
    </Button>
  );
}
