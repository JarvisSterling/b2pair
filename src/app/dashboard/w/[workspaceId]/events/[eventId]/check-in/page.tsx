"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSWRFetch } from "@/hooks/use-swr-fetch";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Loader2,
  Search,
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Undo2,
  Scan,
  Keyboard,
  Camera,
  Maximize2,
  BadgeCheck,
} from "lucide-react";
import { QrCameraScanner } from "@/components/qr-camera-scanner";
import { PrintBadgeButton } from "@/components/badges/print-badge-button";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { toast } from "sonner";

interface CheckIn {
  id: string;
  checked_in_at: string;
  method: string;
  participant: {
    id: string;
    profiles: {
      full_name: string;
      email: string;
      avatar_url: string | null;
      company_name: string | null;
      title: string | null;
    };
  };
}

export default function CheckInDashboard() {
  const params = useParams();
  const eventId = params.eventId as string;
  const workspaceId = params.workspaceId as string;

  const { data: checkinData, isLoading: loading, mutate } = useSWRFetch<{
    totalParticipants: number; checkedInCount: number; checkIns: CheckIn[];
  }>(`/api/checkin?eventId=${eventId}`);

  const totalParticipants = checkinData?.totalParticipants || 0;
  const checkedInCount = checkinData?.checkedInCount || 0;
  const checkIns = checkinData?.checkIns || [];

  // Scan mode
  const [mode, setMode] = useState<"scan" | "camera" | "search">("scan");
  const [cameraPaused, setCameraPaused] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    alreadyCheckedIn: boolean;
    participant: any;
    participantId?: string;
  } | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel("check-ins")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins", filter: `event_id=eq.${eventId}` },
        () => mutate()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mutate, eventId]);

  // Auto-focus scan input
  useEffect(() => {
    if (mode === "scan") scanInputRef.current?.focus();
  }, [mode]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setProcessing(true);
    setLastResult(null);
    const toastId = toast.loading("Checking in...");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, token: scanInput.trim(), method: "qr" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Invalid QR code");
      toast.success("Check-in processed", { id: toastId });

      setLastResult({
        success: true,
        alreadyCheckedIn: data.alreadyCheckedIn,
        participant: data.participant,
        participantId: data.participantId,
      });
      if (!data.alreadyCheckedIn) {
        mutate();
        mutate();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check-in failed", { id: toastId });
      setLastResult({ success: false, alreadyCheckedIn: false, participant: null });
    } finally {
      setProcessing(false);
      scanInputRef.current?.focus();
    }

    setScanInput("");

    // Clear result after 4 seconds
    setTimeout(() => setLastResult(null), 4000);
  }

  async function handleCameraScan(token: string) {
    if (cameraPaused) return;
    setCameraPaused(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, token, method: "qr" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Invalid QR code");

      setLastResult({
        success: true,
        alreadyCheckedIn: data.alreadyCheckedIn,
        participant: data.participant,
        participantId: data.participantId,
      });
      if (!data.alreadyCheckedIn) mutate();
    } catch {
      setLastResult({ success: false, alreadyCheckedIn: false, participant: null });
    }

    // Resume scanner after 5 seconds (extra time for print badge tap)
    setTimeout(() => {
      setLastResult(null);
      setCameraPaused(false);
    }, 5000);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("participants")
      .select("id, status, profiles!inner(full_name, email, avatar_url, company_name, title)")
      .eq("event_id", eventId)
      .eq("status", "approved")
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`, { referencedTable: "profiles" })
      .limit(10);

    // Check which are already checked in
    const results = await Promise.all(
      (data || []).map(async (p: any) => {
        const { data: checkIn } = await supabase
          .from("check_ins")
          .select("id")
          .eq("event_id", eventId)
          .eq("participant_id", p.id)
          .is("session_id", null)
          .single();

        return { ...p, isCheckedIn: !!checkIn };
      })
    );

    setSearchResults(results);
    setSearching(false);
  }

  async function manualCheckIn(participantId: string) {
    setProcessing(true);
    try {
      await toast.promise(
        (async () => {
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId, participantId, method: "manual" }),
          });
          if (!res.ok) throw new Error("Failed to check in");
        })(),
        {
          loading: "Checking in...",
          success: "Checked in",
          error: "Failed to check in",
        }
      );
      // Optimistically update search results immediately
      setSearchResults((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, isCheckedIn: true } : p))
      );
      // Optimistically bump stats, then revalidate in background
      mutate(
        (current: any) =>
          current ? { ...current, checkedInCount: (current.checkedInCount || 0) + 1 } : current,
        { revalidate: true }
      );
    } finally {
      setProcessing(false);
    }
  }

  async function undoCheckIn(checkInId: string, participantId?: string) {
    // Optimistically remove from list and decrement count
    mutate(
      (current: any) =>
        current
          ? {
              ...current,
              checkedInCount: Math.max(0, (current.checkedInCount || 0) - 1),
              checkIns: current.checkIns.filter((ci: any) => ci.id !== checkInId),
            }
          : current,
      { revalidate: false }
    );
    // Also optimistically update search results if we know the participant
    if (participantId) {
      setSearchResults((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, isCheckedIn: false } : p))
      );
    }

    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/checkin?id=${checkInId}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to undo");
        })(),
        {
          loading: "Undoing...",
          success: "Check-in removed",
          error: "Failed to undo",
        }
      );
    } finally {
      mutate(); // Revalidate to sync with server
    }
  }

  const checkedInPct = totalParticipants > 0
    ? Math.round((checkedInCount / totalParticipants) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Check-in</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Real-time event check-in dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/w/${params.workspaceId}/events/${eventId}/check-in/badges`}>
            <Button variant="outline" className="gap-2">
              <BadgeCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Badges</span>
            </Button>
          </Link>
          <Link href={`/dashboard/w/${params.workspaceId}/events/${eventId}/check-in/kiosk`} target="_blank">
            <Button variant="outline" className="gap-2">
              <Maximize2 className="h-4 w-4" />
              <span className="hidden sm:inline">Kiosk mode</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:pb-5 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-h2 font-semibold">{totalParticipants}</p>
            <p className="text-[10px] sm:text-caption text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:pb-5 text-center">
            <UserCheck className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-h2 font-semibold text-emerald-600">{checkedInCount}</p>
            <p className="text-[10px] sm:text-caption text-muted-foreground">Checked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:pb-5 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-h2 font-semibold">{totalParticipants - checkedInCount}</p>
            <p className="text-[10px] sm:text-caption text-muted-foreground">Remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-caption mb-1.5">
          <span className="text-muted-foreground">Check-in progress</span>
          <span className="font-semibold">{checkedInPct}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${checkedInPct}%` }}
          />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={mode === "scan" ? "default" : "outline"}
          onClick={() => setMode("scan")}
          className="gap-1.5 flex-1 sm:flex-none"
        >
          <Scan className="h-4 w-4" />
          <span className="hidden sm:inline">Scan QR</span>
          <span className="sm:hidden">Scan</span>
        </Button>
        <Button
          variant={mode === "camera" ? "default" : "outline"}
          onClick={() => { setMode("camera"); setCameraPaused(false); setLastResult(null); }}
          className="gap-1.5 flex-1 sm:flex-none"
        >
          <Camera className="h-4 w-4" />
          Camera
        </Button>
        <Button
          variant={mode === "search" ? "default" : "outline"}
          onClick={() => setMode("search")}
          className="gap-1.5 flex-1 sm:flex-none"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Manual search</span>
          <span className="sm:hidden">Search</span>
        </Button>
      </div>

      {/* Scan mode */}
      {mode === "scan" && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-caption text-muted-foreground mb-3">
              Scan a QR code or paste the token below. The input auto-focuses for barcode scanner use.
            </p>
            <form onSubmit={handleScan} className="flex gap-2">
              <Input
                ref={scanInputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or paste QR token..."
                className="flex-1 font-mono"
                autoFocus
                disabled={processing}
              />
              <Button type="submit" disabled={processing || !scanInput.trim()}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
              </Button>
            </form>

            {/* Scan result feedback */}
            {lastResult && (
              <div
                className={`mt-4 p-4 rounded-lg animate-fade-in ${
                  lastResult.success
                    ? lastResult.alreadyCheckedIn
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {lastResult.success ? (
                    lastResult.alreadyCheckedIn ? (
                      <Clock className="h-6 w-6 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    )
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {lastResult.success ? (
                      <>
                        <p className="text-body font-semibold">
                          {lastResult.participant?.full_name}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {lastResult.alreadyCheckedIn
                            ? "Already checked in"
                            : "Successfully checked in!"}
                        </p>
                      </>
                    ) : (
                      <p className="text-body font-medium text-red-600">
                        Invalid QR code
                      </p>
                    )}
                  </div>
                  {lastResult.success && lastResult.participantId && (
                    <PrintBadgeButton
                      participantId={lastResult.participantId}
                      eventId={eventId}
                      size="sm"
                      variant="outline"
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Camera mode */}
      {mode === "camera" && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-caption text-muted-foreground mb-4">
              Point the camera at an attendee&apos;s QR code to check them in instantly.
            </p>
            <QrCameraScanner onScan={handleCameraScan} paused={cameraPaused} />

            {/* Camera scan result */}
            {lastResult && (
              <div className={`mt-4 p-4 rounded-lg animate-fade-in ${
                lastResult.success
                  ? lastResult.alreadyCheckedIn
                    ? "bg-amber-500/10 border border-amber-500/30"
                    : "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-red-500/10 border border-red-500/30"
              }`}>
                <div className="flex items-center gap-3">
                  {lastResult.success ? (
                    lastResult.alreadyCheckedIn
                      ? <Clock className="h-6 w-6 text-amber-500 shrink-0" />
                      : <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {lastResult.success ? (
                      <>
                        <p className="text-body font-semibold">{lastResult.participant?.full_name}</p>
                        <p className="text-caption text-muted-foreground">
                          {lastResult.alreadyCheckedIn ? "Already checked in" : "Successfully checked in!"}
                        </p>
                      </>
                    ) : (
                      <p className="text-body font-medium text-red-600">Invalid QR code</p>
                    )}
                  </div>
                  {lastResult.success && lastResult.participantId && (
                    <PrintBadgeButton
                      participantId={lastResult.participantId}
                      eventId={eventId}
                      size="sm"
                      variant="outline"
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search mode */}
      {mode === "search" && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-caption text-muted-foreground mb-3">
              Search by name, email, or company to manually check someone in.
            </p>
            <div className="flex gap-2 mb-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search participants..."
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((p: any) => {
                  const profile = p.profiles;
                  const initials = profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border"
                    >
                      {profile.avatar_url ? (
                        <SafeImage src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" width={36} height={36} />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium truncate">{profile.full_name}</p>
                        <p className="text-caption text-muted-foreground truncate">
                          {profile.email}
                          {profile.company_name ? ` · ${profile.company_name}` : ""}
                        </p>
                      </div>
                      {p.isCheckedIn ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Checked in
                          </Badge>
                          <PrintBadgeButton
                            participantId={p.id}
                            eventId={eventId}
                            size="sm"
                            variant="ghost"
                          />
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => manualCheckIn(p.id)}
                          disabled={processing}
                        >
                          {processing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <UserCheck className="mr-1 h-3 w-3" />}
                          Check in
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent check-ins */}
      <div>
        <h2 className="text-body font-semibold mb-3">
          Recent check-ins
          {checkIns.length > 0 && (
            <span className="ml-2 text-caption text-muted-foreground font-normal">
              ({checkIns.length})
            </span>
          )}
        </h2>

        {checkIns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <QrCode className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">No check-ins yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {checkIns.map((ci) => {
              const profile = (ci.participant as any)?.profiles;
              if (!profile) return null;
              const initials = profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              const time = new Date(ci.checked_in_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={ci.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 group transition-colors"
                >
                  {profile.avatar_url ? (
                    <SafeImage src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" width={32} height={32} />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-small font-medium shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium truncate">{profile.full_name}</p>
                    <p className="text-caption text-muted-foreground truncate">
                      {[profile.title, profile.company_name].filter(Boolean).join(" at ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{ci.method}</Badge>
                    <span className="text-caption text-muted-foreground">{time}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      {(ci.participant as any)?.id && (
                        <PrintBadgeButton
                          participantId={(ci.participant as any).id}
                          eventId={eventId}
                          size="sm"
                          variant="ghost"
                          label=""
                          className="h-7 w-7 p-0"
                        />
                      )}
                      <button
                        onClick={() => undoCheckIn(ci.id, (ci.participant as any)?.id)}
                        className="p-1 rounded hover:bg-secondary"
                        title="Undo check-in"
                      >
                        <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
