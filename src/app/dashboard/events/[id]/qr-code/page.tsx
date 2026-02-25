"use client";

import { useCallback, useEffect, useState } from "react";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, CheckCircle2 } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

export default function MyQRCodePage() {
  const eventId = useEventId();
  const [token, setToken] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQR = useCallback(async () => {
    const res = await fetch(`/api/checkin?eventId=${eventId}&mode=my-qr`);
    const data = await res.json();
    setToken(data.token);
    setCheckedIn(data.checkedIn);
    setCheckedInAt(data.checkedInAt);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { loadQR(); }, [loadQR]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // QR code via Google Charts API (no dependency needed)
  const qrUrl = token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`
    : null;

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-h1 font-semibold tracking-tight">My QR Code</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Show this to check in at the event
        </p>
      </div>

      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center">
            {checkedIn && (
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="success" className="gap-1.5 text-sm py-1 px-3">
                  <CheckCircle2 className="h-4 w-4" />
                  Checked in
                </Badge>
                {checkedInAt && (
                  <span className="text-caption text-muted-foreground">
                    {new Date(checkedInAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            )}

            {qrUrl ? (
              <div className={`p-4 bg-white rounded-xl ${checkedIn ? "opacity-50" : ""}`}>
                <SafeImage src={qrUrl} alt="QR Code" className="w-64 h-64" width={256} height={256} />
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <QrCode className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-body text-muted-foreground">Unable to generate QR code</p>
              </div>
            )}

            {token && (
              <p className="mt-4 text-[10px] font-mono text-muted-foreground/50 break-all text-center max-w-64">
                {token}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-caption text-muted-foreground mt-4">
        {checkedIn
          ? "You're all set! Enjoy the event."
          : "Present this QR code at the registration desk."}
      </p>
    </div>
  );
}
