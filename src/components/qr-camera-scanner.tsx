"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CameraOff, SwitchCamera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCameraScannerProps {
  onScan: (result: string) => void;
  paused?: boolean;
}

/** Brief pause needed on iOS/Safari after releasing a stream before reacquiring */
const IOS_CAMERA_RELEASE_DELAY_MS = 500;

export function QrCameraScanner({ onScan, paused = false }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);

  // Stable refs so the scanner callback never captures stale closures
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Populated once during first startScanner() call
  const camerasRef = useRef<{ id: string; label: string }[]>([]);
  const cameraIndexRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraCount, setCameraCount] = useState(0);

  // ── Destroy helper — waits for iOS to actually release the stream ──────────
  async function destroyScanner() {
    if (!scannerRef.current) return;
    try {
      scannerRef.current.stop();
      scannerRef.current.destroy();
    } catch { /* ignore */ }
    scannerRef.current = null;
    // iOS Safari holds the camera stream briefly after destroy —
    // starting a new one too quickly causes NotReadableError / black frame.
    await new Promise<void>((r) => setTimeout(r, IOS_CAMERA_RELEASE_DELAY_MS));
  }

  // ── Full scanner init (used on mount and retry) ────────────────────────────
  async function startScanner(cameraId?: string) {
    if (!videoRef.current) return;

    await destroyScanner();
    setError(null);

    try {
      const QrScanner = (await import("qr-scanner")).default;

      // Enumerate cameras once (also triggers permission prompt)
      if (camerasRef.current.length === 0) {
        try {
          const cams = await QrScanner.listCameras(true);
          camerasRef.current = cams;
          setCameraCount(cams.length);
          // Default: last camera = back camera on phones & tablets
          if (!cameraId && cams.length > 0) {
            cameraIndexRef.current = cams.length - 1;
            cameraId = cams[cameraIndexRef.current].id;
          }
        } catch {
          // listCameras denied or unavailable — fall back to facing-mode hint
        }
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result: any) => {
          if (!pausedRef.current) onScanRef.current(result.data);
        },
        {
          preferredCamera: cameraId ?? "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setLoading(false);
      setSwitching(false);
    } catch (err: any) {
      scannerRef.current = null;
      const msg = (err?.message ?? "").toLowerCase();
      if (msg.includes("permission") || msg.includes("notallowed")) {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (msg.includes("notfound") || msg.includes("devicenotfound") || msg.includes("no camera")) {
        setError("No camera found on this device.");
      } else if (msg.includes("notreadable") || msg.includes("could not start video source") || msg.includes("starting videoinput failed")) {
        setError("Camera is in use by another app. Close other apps and try again.");
      } else {
        setError("Could not start the camera. Please try again.");
      }
      setLoading(false);
      setSwitching(false);
    }
  }

  // ── Switch camera — uses setCamera() to avoid stream teardown on iOS ───────
  async function handleSwitchCamera() {
    const cams = camerasRef.current;
    if (cams.length < 2) return;

    const nextIndex = (cameraIndexRef.current + 1) % cams.length;
    cameraIndexRef.current = nextIndex;
    setSwitching(true);

    // Preferred path: setCamera() keeps the existing scanner alive and just
    // switches the stream — no destroy/recreate, no iOS release timing issue.
    if (scannerRef.current) {
      try {
        await scannerRef.current.setCamera(cams[nextIndex].id);
        setSwitching(false);
        return;
      } catch {
        // setCamera() failed — fall through to full restart below
      }
    }

    // Fallback: full restart with the new camera
    await startScanner(cams[nextIndex].id);
  }

  // ── Retry after error ──────────────────────────────────────────────────────
  async function handleRetry() {
    setLoading(true);
    setError(null);
    // Reset camera list so enumeration runs again (handles permission re-grant)
    camerasRef.current = [];
    cameraIndexRef.current = 0;
    setCameraCount(0);
    await startScanner();
  }

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    startScanner();
    return () => {
      // Fire-and-forget cleanup on unmount
      try {
        scannerRef.current?.stop();
        scannerRef.current?.destroy();
      } catch { /* ignore */ }
      scannerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pause / resume during check-in processing ─────────────────────────────
  useEffect(() => {
    if (!scannerRef.current) return;
    if (paused) {
      try { scannerRef.current.pause(); } catch { /* ignore */ }
    } else {
      scannerRef.current.start().catch(() => { /* ignore if already running */ });
    }
  }, [paused]);

  /* ── Error state ──────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-muted/30 border border-border aspect-square max-w-sm mx-auto p-8 text-center">
        <CameraOff className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-caption text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={handleRetry} disabled={loading}>
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          }
          {loading ? "Starting camera…" : "Try again"}
        </Button>
      </div>
    );
  }

  /* ── Scanner ──────────────────────────────────────────────────────────── */
  return (
    <div className="relative mx-auto max-w-sm w-full">

      {/* Loading / switching overlay — prevents black flash */}
      {(loading || switching) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          {switching && (
            <p className="text-xs text-white/70">Switching camera…</p>
          )}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Corner-bracket scan frame */}
        {!loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-52 h-52">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-md" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-md" />
              <div className="absolute left-2 right-2 h-0.5 bg-primary/70 animate-scan-line" />
            </div>
          </div>
        )}
      </div>

      {/* Switch camera — only shown when 2+ cameras detected */}
      {!loading && cameraCount > 1 && (
        <Button
          size="sm"
          variant="outline"
          disabled={switching}
          onClick={handleSwitchCamera}
          className="absolute bottom-3 right-3 gap-1.5 bg-black/50 border-white/20 text-white hover:bg-black/70 hover:text-white"
        >
          {switching
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <SwitchCamera className="h-3.5 w-3.5" />
          }
          {switching ? "Switching…" : "Switch camera"}
        </Button>
      )}
    </div>
  );
}
