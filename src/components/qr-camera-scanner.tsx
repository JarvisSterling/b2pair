"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CameraOff, SwitchCamera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCameraScannerProps {
  onScan: (result: string) => void;
  paused?: boolean;
}

export function QrCameraScanner({ onScan, paused = false }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);

  // Keep live refs so the scanner callback never captures stale values
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Camera list (populated once on first start)
  const camerasRef = useRef<{ id: string; label: string }[]>([]);
  const cameraIndexRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraCount, setCameraCount] = useState(0);

  async function startCamera(cameraId?: string) {
    if (!videoRef.current) return;

    // Tear down any existing scanner first
    try { scannerRef.current?.destroy(); } catch {}
    scannerRef.current = null;

    try {
      const QrScanner = (await import("qr-scanner")).default;

      // Enumerate cameras exactly once (listCameras also triggers the permission prompt)
      if (camerasRef.current.length === 0) {
        try {
          const cams = await QrScanner.listCameras(true);
          camerasRef.current = cams;
          setCameraCount(cams.length);

          // Default: last camera in the list — back camera on phones & tablets
          if (!cameraId && cams.length > 0) {
            cameraIndexRef.current = cams.length - 1;
            cameraId = cams[cameraIndexRef.current].id;
          }
        } catch {
          // listCameras failed — fall back to facing-mode hint below
        }
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result: any) => {
          if (!pausedRef.current) onScanRef.current(result.data);
        },
        {
          // Prefer explicit device ID; fall back to back-camera hint
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
      const msg = (err?.message ?? "").toLowerCase();
      if (msg.includes("permission") || msg.includes("notallowed")) {
        setError("Camera permission denied. Please allow camera access and try again.");
      } else if (msg.includes("notfound") || msg.includes("devicenotfound") || msg.includes("no camera")) {
        setError("No camera found on this device.");
      } else {
        setError("Could not start the camera. Please try again.");
      }
      setLoading(false);
      setSwitching(false);
    }
  }

  // Mount — start the scanner once
  useEffect(() => {
    startCamera();
    return () => {
      try { scannerRef.current?.destroy(); } catch {}
      scannerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause / resume when the kiosk is processing a scan
  useEffect(() => {
    if (!scannerRef.current) return;
    if (paused) {
      scannerRef.current.pause();
    } else {
      scannerRef.current.start().catch(() => {});
    }
  }, [paused]);

  async function handleSwitchCamera() {
    const cams = camerasRef.current;
    if (cams.length < 2) return;
    const nextIndex = (cameraIndexRef.current + 1) % cams.length;
    cameraIndexRef.current = nextIndex;
    setSwitching(true);
    setError(null);
    await startCamera(cams[nextIndex].id);
  }

  function handleRetry() {
    setLoading(true);
    setError(null);
    // Reset camera list so enumeration runs again
    camerasRef.current = [];
    cameraIndexRef.current = 0;
    setCameraCount(0);
    startCamera();
  }

  /* ── Error state ─────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-muted/30 border border-border aspect-square max-w-sm mx-auto p-8 text-center">
        <CameraOff className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-caption text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={handleRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Try again
        </Button>
      </div>
    );
  }

  /* ── Scanner ─────────────────────────────────────────────────── */
  return (
    <div className="relative mx-auto max-w-sm w-full">

      {/* Loading / switching overlay — prevents black flash */}
      {(loading || switching) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
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

      {/* Switch camera — only rendered when 2+ cameras are detected */}
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
