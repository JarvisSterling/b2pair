"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CameraOff, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCameraScannerProps {
  onScan: (result: string) => void;
  paused?: boolean;
}

export function QrCameraScanner({ onScan, paused = false }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let scanner: any = null;

    async function startScanner() {
      if (!videoRef.current) return;
      setLoading(true);
      setError(null);

      try {
        // Dynamic import to avoid SSR issues
        const QrScanner = (await import("qr-scanner")).default;

        scanner = new QrScanner(
          videoRef.current,
          (result: any) => {
            if (!paused) onScan(result.data);
          },
          {
            preferredCamera: facingMode,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
        setLoading(false);
      } catch (err: any) {
        setError(
          err?.message?.includes("permission")
            ? "Camera permission denied. Please allow camera access and try again."
            : "Camera not available on this device."
        );
        setLoading(false);
      }
    }

    startScanner();

    return () => {
      scanner?.destroy();
      scannerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Pause/resume on prop change
  useEffect(() => {
    if (!scannerRef.current) return;
    if (paused) {
      scannerRef.current.pause();
    } else {
      scannerRef.current.start().catch(() => {});
    }
  }, [paused]);

  async function flipCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-muted/30 border border-border aspect-square max-w-sm mx-auto p-8 text-center">
        <CameraOff className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-caption text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-sm">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/40 rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

        {/* Scan frame overlay */}
        {!loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-52 h-52">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-md" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-md" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-primary/70 animate-scan-line" />
            </div>
          </div>
        )}
      </div>

      {/* Flip camera button */}
      {!loading && !error && (
        <Button
          size="sm"
          variant="outline"
          className="absolute bottom-3 right-3 gap-1.5"
          onClick={flipCamera}
        >
          <FlipHorizontal className="h-3.5 w-3.5" />
          Flip
        </Button>
      )}
    </div>
  );
}
