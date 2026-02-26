"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DuplicateEventButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDuplicate() {
    if (!confirm("Create a copy of this event?")) return;
    setLoading(true);
    const toastId = toast.loading("Duplicating...");

    try {
      const res = await fetch("/api/events/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.event) throw new Error(payload.error || "Failed to duplicate");
      toast.success("Event duplicated", { id: toastId });
      router.push(`/dashboard/events/${payload.event.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
      Duplicate
    </Button>
  );
}
