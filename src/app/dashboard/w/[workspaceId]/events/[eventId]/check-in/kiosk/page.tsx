"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QrCameraScanner } from "@/components/qr-camera-scanner";
import { CheckCircle2, XCircle, Clock, QrCode } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { PrintBadgeButton } from "@/components/badges/print-badge-button";

type KioskState = "idle" | "processing" | "success" | "already" | "error";

interface CheckInResult {
  full_name: string;
  title: string | null;
  company_name: string | null;
  avatar_url: string | null;
  participantId?: string;
}

export default function KioskPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [state, setState] = useState<KioskState>("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [eventName, setEventName] = useState<string>("");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("name")
        .eq("id", eventId)
        .single();
      if (data) setEventName(data.name);
    }
    loadEvent();
  }, [eventId]);

  async function handleScan(token: string) {
    if (paused) return;
    setPaused(true);
    setState("processing");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, token, method: "qr" }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Invalid QR code");

      const isSuccess = !data.alreadyCheckedIn && res.ok;
      setResult({ ...data.participant, participantId: data.participantId });
      setState(data.alreadyCheckedIn ? "already" : "success");

      // Give more time on fresh success so organizer can tap Print Badge
      const delay = isSuccess ? 8000 : 4000;
      setTimeout(() => {
        setState("idle");
        setResult(null);
        setPaused(false);
      }, delay);
    } catch {
      setState("error");
      setResult(null);
      setTimeout(() => {
        setState("idle");
        setResult(null);
        setPaused(false);
      }, 4000);
    }
  }

  const initials = result?.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-start overflow-hidden">
      {/* Header */}
      <div className="w-full flex items-center justify-center py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-small font-bold">B2</div>
          {eventName && <h1 className="text-h3 font-semibold">{eventName}</h1>}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 gap-8">

        {/* Idle / scanning state */}
        {(state === "idle" || state === "processing") && (
          <>
            <div className="text-center">
              <h2 className="text-h2 font-semibold mb-1">Check in</h2>
              <p className="text-body text-muted-foreground">
                Point your QR code at the camera
              </p>
            </div>
            <QrCameraScanner onScan={handleScan} paused={state === "processing"} />
            {state === "processing" && (
              <p className="text-caption text-muted-foreground animate-pulse">Processing...</p>
            )}
          </>
        )}

        {/* Success state */}
        {state === "success" && result && (
          <div className="flex flex-col items-center gap-5 animate-scale-in text-center">
            <div className="relative">
              {result.avatar_url ? (
                <SafeImage
                  src={result.avatar_url}
                  alt={result.full_name}
                  className="h-24 w-24 rounded-full object-cover"
                  width={96}
                  height={96}
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 text-h1 font-bold">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-h1 font-bold text-emerald-500">Welcome!</h2>
              <p className="text-h3 font-semibold mt-1">{result.full_name}</p>
              {(result.title || result.company_name) && (
                <p className="text-body text-muted-foreground mt-0.5">
                  {[result.title, result.company_name].filter(Boolean).join(" at ")}
                </p>
              )}
              <p className="text-caption text-muted-foreground mt-3">
                You&apos;re checked in. Enjoy the event! 🎉
              </p>
            </div>
            {result.participantId && (
              <PrintBadgeButton
                participantId={result.participantId}
                eventId={eventId}
                size="default"
                variant="outline"
                label="Print Badge"
                className="mt-2 gap-2 px-6"
              />
            )}
          </div>
        )}

        {/* Already checked in */}
        {state === "already" && result && (
          <div className="flex flex-col items-center gap-5 animate-scale-in text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/20">
              <Clock className="h-12 w-12 text-amber-500" />
            </div>
            <div>
              <h2 className="text-h2 font-bold text-amber-500">Already checked in</h2>
              <p className="text-h3 font-semibold mt-1">{result.full_name}</p>
              <p className="text-caption text-muted-foreground mt-3">
                You were already checked in. Enjoy the event!
              </p>
            </div>
            {result.participantId && (
              <PrintBadgeButton
                participantId={result.participantId}
                eventId={eventId}
                size="default"
                variant="outline"
                label="Print Badge"
                className="mt-2 gap-2 px-6"
              />
            )}
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="flex flex-col items-center gap-5 animate-scale-in text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <div>
              <h2 className="text-h2 font-bold text-red-500">Invalid QR code</h2>
              <p className="text-body text-muted-foreground mt-2">
                Please make sure you&apos;re using your B2Pair QR code.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full py-4 text-center">
        <p className="text-small text-muted-foreground/40 flex items-center justify-center gap-1.5">
          <QrCode className="h-3 w-3" />
          Powered by B2Pair
        </p>
      </div>
    </div>
  );
}
