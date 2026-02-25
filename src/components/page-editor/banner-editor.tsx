"use client";

import { useState, useRef } from "react";
import {
  ImageIcon,
  Layout,
  Upload,
  Loader2,
  Trash2,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";

export type BannerLayout = "split" | "image-below" | "centered" | "full-bleed";

interface BannerEditorProps {
  eventName: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  bannerLayout: BannerLayout;
  bannerSettings?: Record<string, any>;
  onBannerUrlChange: (url: string | null) => void;
  onBannerLayoutChange: (layout: BannerLayout) => void;
  eventId: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const LAYOUTS: { key: BannerLayout; label: string }[] = [
  { key: "split", label: "Split" },
  { key: "image-below", label: "Image Below" },
  { key: "centered", label: "Centered" },
  { key: "full-bleed", label: "Full Bleed" },
];

export function BannerEditor({
  eventName,
  startDate,
  endDate,
  bannerUrl,
  bannerLayout,
  bannerSettings = {},
  onBannerUrlChange,
  onBannerLayoutChange,
  eventId,
}: BannerEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);
      fd.append("type", "banner");
      const res = await fetch("/api/events/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) onBannerUrlChange(data.url);
    } catch (err) {
      console.error("Banner upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden bg-background group">
        {/* Render the selected layout */}
        {bannerLayout === "split" && (
          <SplitLayout
            eventName={eventName}
            dateRange={dateRange}
            bannerUrl={bannerUrl}
            settings={bannerSettings}
          />
        )}
        {bannerLayout === "image-below" && (
          <ImageBelowLayout
            eventName={eventName}
            dateRange={dateRange}
            bannerUrl={bannerUrl}
            settings={bannerSettings}
          />
        )}
        {bannerLayout === "centered" && (
          <CenteredLayout
            eventName={eventName}
            dateRange={dateRange}
            bannerUrl={bannerUrl}
            settings={bannerSettings}
          />
        )}
        {bannerLayout === "full-bleed" && (
          <FullBleedLayout
            eventName={eventName}
            dateRange={dateRange}
            bannerUrl={bannerUrl}
            settings={bannerSettings}
          />
        )}

        {/* Overlay controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <Button
            size="sm"
            variant="secondary"
            className="bg-black/70 text-white hover:bg-black/80 border-0 h-8 text-xs gap-1.5 backdrop-blur-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            Image
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="bg-black/70 text-white hover:bg-black/80 border-0 h-8 text-xs gap-1.5 backdrop-blur-sm"
            onClick={() => setShowLayoutPicker(!showLayoutPicker)}
          >
            <Layout className="h-3.5 w-3.5" />
            Banner layout
          </Button>
          {bannerUrl && (
            <Button
              size="sm"
              variant="secondary"
              className="bg-black/70 text-white hover:bg-black/80 border-0 h-8 text-xs gap-1.5 backdrop-blur-sm"
              onClick={() => onBannerUrlChange(null)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />

        {/* Layout picker popover */}
        {showLayoutPicker && (
          <div className="absolute bottom-16 left-4 z-30 bg-background border border-border rounded-xl shadow-elevated p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Banner Layout</p>
              <button
                onClick={() => setShowLayoutPicker(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map((layout) => (
                <button
                  key={layout.key}
                  onClick={() => {
                    onBannerLayoutChange(layout.key);
                    setShowLayoutPicker(false);
                  }}
                  className={cn(
                    "rounded-lg border-2 p-1.5 transition-all hover:border-primary/50",
                    bannerLayout === layout.key
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border/60"
                  )}
                >
                  <LayoutThumbnail layout={layout.key} />
                  <p className="text-[10px] font-medium text-center mt-1.5 text-muted-foreground">
                    {layout.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Layout thumbnails for the picker ─── */
function LayoutThumbnail({ layout }: { layout: BannerLayout }) {
  const base = "w-full h-14 rounded-md overflow-hidden";

  if (layout === "split") {
    return (
      <div className={cn(base, "flex bg-muted/50")}>
        <div className="w-[55%] bg-gradient-to-br from-blue-200 to-cyan-200" />
        <div className="w-[45%] flex flex-col items-center justify-center gap-0.5 p-1">
          <div className="h-1 w-8 bg-muted-foreground/20 rounded" />
          <div className="h-1.5 w-10 bg-foreground/30 rounded" />
          <div className="h-3 w-8 bg-primary/40 rounded mt-0.5" />
        </div>
      </div>
    );
  }

  if (layout === "image-below") {
    return (
      <div className={cn(base, "flex flex-col bg-slate-700")}>
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="space-y-0.5">
            <div className="h-1 w-6 bg-white/30 rounded" />
            <div className="h-1.5 w-10 bg-white/60 rounded" />
          </div>
          <div className="h-3 w-6 bg-primary/60 rounded" />
        </div>
        <div className="flex-1 mx-2 mb-1 rounded-sm bg-gradient-to-br from-blue-300 to-cyan-300" />
      </div>
    );
  }

  if (layout === "centered") {
    return (
      <div className={cn(base, "flex flex-col items-center bg-slate-700")}>
        <div className="flex flex-col items-center gap-0.5 pt-1.5">
          <div className="h-1.5 w-12 bg-white/60 rounded" />
          <div className="h-1 w-8 bg-white/30 rounded" />
          <div className="h-2.5 w-8 bg-primary/60 rounded" />
        </div>
        <div className="flex-1 w-[70%] mt-1 mb-1 rounded-sm bg-gradient-to-br from-blue-300 to-cyan-300" />
      </div>
    );
  }

  // full-bleed
  return (
    <div className={cn(base, "relative bg-gradient-to-br from-blue-300 to-cyan-300")}>
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-0.5">
        <div className="h-1 w-8 bg-white/40 rounded" />
        <div className="h-1.5 w-12 bg-white/70 rounded" />
        <div className="h-3 w-8 bg-primary/60 rounded mt-0.5" />
      </div>
    </div>
  );
}

/* ─── Actual banner layouts ─── */
function BannerImage({
  url,
  className,
}: {
  url: string | null;
  className?: string;
}) {
  if (!url) {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center",
          className
        )}
      >
        <div className="text-center text-muted-foreground/40">
          <ImageIcon className="h-8 w-8 mx-auto mb-1" />
          <p className="text-xs">Upload a banner image</p>
        </div>
      </div>
    );
  }

  return (
    <SafeImage src={url} alt="Event banner" className={cn("object-cover", className)} width={400} height={200} />
  );
}

function RegisterButton() {
  return (
    <span className="inline-block px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg">
      Register now
    </span>
  );
}

interface LayoutProps {
  eventName: string;
  dateRange: string;
  bannerUrl: string | null;
  settings: Record<string, any>;
}

function SplitLayout({ eventName, dateRange, bannerUrl, settings }: LayoutProps) {
  const bgOpacity = (settings.bgOpacity ?? 30) / 100;
  const blur = settings.blur ?? 4;
  // Fade the gradient overlay inversely with opacity so at 100% there's no whitewash
  const gradientOpacity = Math.max(0, 1 - bgOpacity);

  return (
    <div className="relative min-h-[440px] overflow-hidden">
      {bannerUrl ? (
        <>
          <SafeImage 
            src={bannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} width={800} height={400} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(255,255,255,${gradientOpacity * 0.4}), rgba(255,255,255,${gradientOpacity * 0.8}))` }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20" />
      )}
      <div className="relative z-10 flex max-w-3xl mx-auto my-12 rounded-xl overflow-hidden shadow-lg bg-background border border-border/60">
        <div className="w-[58%] relative min-h-[320px]">
          <BannerImage url={bannerUrl} className="w-full h-full absolute inset-0" />
        </div>
        <div className="w-[42%] flex flex-col justify-center px-8 py-10">
          <p className="text-xs text-muted-foreground mb-2">{dateRange}</p>
          <h1 className="text-2xl font-bold tracking-tight mb-8">{eventName}</h1>
          <div>
            <RegisterButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageBelowLayout({ eventName, dateRange, bannerUrl, settings }: LayoutProps) {
  const bgOpacity = (settings.bgOpacity ?? 20) / 100;
  const blur = settings.blur ?? 4;
  const darkOverlay = Math.max(0.3, 0.9 - bgOpacity * 0.6);

  return (
    <div className="relative min-h-[480px] overflow-hidden">
      {bannerUrl ? (
        <>
          <SafeImage src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} width={800} height={400} />
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(30,41,59,${darkOverlay})` }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-800" />
      )}
      <div className="relative z-10 max-w-3xl mx-auto pt-12 pb-12 px-4">
        <div className="flex items-center justify-between mb-8 text-white">
          <div>
            <p className="text-sm text-white/60 mb-2">{dateRange}</p>
            <h1 className="text-3xl font-bold tracking-tight">{eventName}</h1>
          </div>
          <RegisterButton />
        </div>
        <div className="rounded-xl overflow-hidden shadow-lg">
          <BannerImage url={bannerUrl} className="w-full h-[320px]" />
        </div>
      </div>
    </div>
  );
}

function CenteredLayout({ eventName, dateRange, bannerUrl, settings }: LayoutProps) {
  const bgOpacity = (settings.bgOpacity ?? 20) / 100;
  const blur = settings.blur ?? 4;
  const darkOverlay = Math.max(0.3, 0.9 - bgOpacity * 0.6);

  return (
    <div className="relative min-h-[500px] overflow-hidden">
      {bannerUrl ? (
        <>
          <SafeImage src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} width={800} height={400} />
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(30,41,59,${darkOverlay})` }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-800" />
      )}
      <div className="relative z-10 max-w-3xl mx-auto pt-12 pb-12 px-4 text-center text-white">
        <h1 className="text-4xl font-bold tracking-tight mb-3">{eventName}</h1>
        <p className="text-sm text-white/60 mb-6">{dateRange}</p>
        <RegisterButton />
        <div className="mt-8 rounded-xl overflow-hidden shadow-lg max-w-2xl mx-auto">
          <BannerImage url={bannerUrl} className="w-full h-[320px]" />
        </div>
      </div>
    </div>
  );
}

function FullBleedLayout({ eventName, dateRange, bannerUrl, settings }: LayoutProps) {
  const overlayOpacity = (settings.overlayOpacity ?? 50) / 100;

  return (
    <div className="relative min-h-[440px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <BannerImage url={bannerUrl} className="w-full h-full" />
      </div>
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />
      <div className="relative z-10 text-center text-white px-8 py-12">
        <p className="text-sm text-white/70 mb-2">{dateRange}</p>
        <h1 className="text-4xl font-bold tracking-tight mb-6">{eventName}</h1>
        <RegisterButton />
      </div>
    </div>
  );
}
