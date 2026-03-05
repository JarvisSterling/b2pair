"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_BADGE_CONFIG, type BadgeConfig, type BadgeElement, type Participant } from "@/components/badges/badge-pdf";

interface PrintBadgeButtonProps {
  participantId: string;
  eventId: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  label?: string;
}

/** Badge sizes in inches for @page CSS rule */
const BADGE_SIZE_INCHES = {
  card:  { w: "3.5in", h: "2.5in" },
  badge: { w: "4in",   h: "3in"   },
  large: { w: "4in",   h: "6in"   },
} as const;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFieldValue(el: BadgeElement, p: Participant, eventName: string): string {
  switch (el.type) {
    case "full_name":  return p.full_name || "";
    case "company":    return p.company_name || "";
    case "title":      return p.title || "";
    case "role":       return p.role || "";
    case "event_name": return eventName;
    default:           return "";
  }
}

function generateBadgeHTML(config: BadgeConfig, participant: Participant, eventName: string): string {
  const sz = BADGE_SIZE_INCHES[config.size];
  const qrToken = participant.qr_token || participant.id;

  const accentHTML = config.showAccentBar
    ? `<div style="position:absolute;${config.accentPosition === "top" ? "top:0" : "bottom:0"};left:0;right:0;height:10%;background:${config.accentColor};"></div>`
    : "";

  const elementsHTML = config.elements
    .filter((el) => el.visible)
    .map((el) => {
      if (el.type === "qr") {
        const qrPx = el.size ?? 60;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrPx * 3}x${qrPx * 3}&data=${encodeURIComponent(qrToken)}&format=png&bgcolor=ffffff&color=000000&margin=4`;
        return `<img src="${qrUrl}" style="position:absolute;width:${qrPx}px;height:${qrPx}px;left:calc(${el.x}% - ${qrPx / 2}px);top:calc(${el.y}% - ${qrPx / 2}px);" />`;
      }
      const text = getFieldValue(el, participant, eventName);
      if (!text) return "";
      const leftPct = el.x - el.width / 2;
      return `<div style="position:absolute;left:${leftPct}%;top:calc(${el.y}% - ${el.fontSize * 0.7}px);width:${el.width}%;font-size:${el.fontSize}px;font-weight:${el.fontWeight};color:${el.color};text-align:${el.align};font-family:Helvetica,Arial,sans-serif;white-space:nowrap;overflow:hidden;">${escapeHtml(text)}</div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background: #fff; }
  .badge { width: ${sz.w}; height: ${sz.h}; position: relative; overflow: hidden; background: ${config.background}; }
  @media print {
    @page { size: ${sz.w} ${sz.h}; margin: 0; }
    body { margin: 0; }
  }
</style>
</head>
<body>
<div class="badge">
  ${accentHTML}
  ${elementsHTML}
</div>
</body>
</html>`;
}

/**
 * Prints a single participant badge by injecting HTML into a hidden iframe
 * and triggering the browser's native print dialog — no tab switch, no PDF.
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

      const badgeConfig: BadgeConfig = configData.badgeConfig ?? DEFAULT_BADGE_CONFIG;
      const eventName: string = configData.eventName ?? "Event";
      const participants: Participant[] = participantData.participants ?? [];

      if (!participants.length) {
        toast.error("Participant data not found");
        return;
      }

      const html = generateBadgeHTML(badgeConfig, participants[0], eventName);

      // Create a hidden zero-size iframe so the print dialog opens over the current page
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Could not access iframe document");

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Wait for QR image to load before printing
      await new Promise<void>((resolve) => {
        const imgs = Array.from(iframeDoc.querySelectorAll("img"));
        if (imgs.length === 0) { resolve(); return; }
        let remaining = imgs.length;
        const done = () => { if (--remaining === 0) resolve(); };
        imgs.forEach((img) => {
          if (img.complete) done();
          else { img.onload = done; img.onerror = done; }
        });
        setTimeout(resolve, 4000); // fallback
      });

      iframe.contentWindow?.print();

      // Clean up iframe after a short delay (print dialog may still be open)
      setTimeout(() => iframe.remove(), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to prepare badge for printing");
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
      {printing ? "Preparing…" : label}
    </Button>
  );
}
