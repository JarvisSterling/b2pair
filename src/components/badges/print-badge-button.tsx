"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_BADGE_CONFIG } from "@/components/badges/badge-pdf";

interface PrintBadgeButtonProps {
  participantId: string;
  eventId: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  label?: string;
}

/**
 * Generates a single-participant badge PDF and opens it in a new tab for printing.
 * Used in the check-in flow (QR scan, camera, manual search, kiosk) after a successful check-in.
 */
export function PrintBadgeButton({
  participantId,
  eventId,
  size = "sm",
  variant = "outline",
  className,
  label = "Print Badge",
}: PrintBadgeButtonProps) {
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    setPrinting(true);
    try {
      const [configRes, participantRes] = await Promise.all([
        fetch(`/api/events/${eventId}/badge-config`),
        fetch(`/api/events/${eventId}/badge-participants?participantId=${participantId}`),
      ]);

      const configData = await configRes.json();
      const participantData = await participantRes.json();

      const badgeConfig = configData.badgeConfig ?? DEFAULT_BADGE_CONFIG;
      const eventName = configData.eventName ?? "Event";
      const eventLogo = configData.eventLogo ?? null;
      const participants = participantData.participants ?? [];

      if (!participants.length) {
        toast.error("Participant data not found");
        return;
      }

      // Dynamically import to avoid SSR issues with @react-pdf/renderer
      const { pdf } = await import("@react-pdf/renderer");
      const { BadgePDFDocument } = await import("@/components/badges/badge-pdf");

      const blob = await pdf(
        <BadgePDFDocument
          config={badgeConfig}
          participants={participants}
          eventName={eventName}
          eventLogo={eventLogo}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate badge");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handlePrint}
      disabled={printing}
      className={className}
    >
      {printing ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
      ) : (
        <Printer className="h-4 w-4 mr-1.5" />
      )}
      {printing ? "Generating…" : label}
    </Button>
  );
}
