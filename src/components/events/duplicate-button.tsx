"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";

export function DuplicateEventButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDuplicate() {
    if (!confirm("Create a copy of this event?")) return;
    setLoading(true);

    const res = await fetch("/api/events/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.event) {
      router.push(`/dashboard/events/${data.event.id}`);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
      Duplicate
    </Button>
  );
}
