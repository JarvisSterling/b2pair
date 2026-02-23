"use client";

import { cn } from "@/lib/utils";

type BannerLayout = "split" | "image-below" | "centered" | "full-bleed";

interface BannerDisplayProps {
  eventName: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  bannerLayout: BannerLayout;
  bannerSettings?: Record<string, any>;
  eventSlug: string;
  isRegistered?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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
          "bg-gradient-to-br from-primary/10 to-primary/5",
          className
        )}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Event banner" className={cn("object-cover", className)} />
  );
}

function RegisterButton({ slug, isRegistered }: { slug: string; isRegistered: boolean }) {
  if (isRegistered) {
    return (
      <span className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Already Registered
      </span>
    );
  }
  return (
    <a
      href={`/events/${slug}#register`}
      className="inline-block px-8 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:brightness-110 transition-all"
    >
      Register now
    </a>
  );
}

export function BannerDisplay({
  eventName,
  startDate,
  endDate,
  bannerUrl,
  bannerLayout,
  bannerSettings = {},
  eventSlug,
  isRegistered = false,
}: BannerDisplayProps) {
  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const bgOpacity = (bannerSettings.bgOpacity ?? 30) / 100;
  const blur = bannerSettings.blur ?? 4;
  const overlayOpacity = (bannerSettings.overlayOpacity ?? 50) / 100;

  if (bannerLayout === "split") {
    const gradientOpacity = Math.max(0, 1 - bgOpacity);
    return (
      <div className="relative min-h-[520px] overflow-hidden">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(255,255,255,${gradientOpacity * 0.4}), rgba(255,255,255,${gradientOpacity * 0.8}))` }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20" />
        )}
        <div className="relative z-10 flex max-w-5xl mx-auto my-14 rounded-xl overflow-hidden shadow-lg bg-background border border-border/60">
          <div className="w-[58%] relative min-h-[380px]">
            <BannerImage url={bannerUrl} className="w-full h-full absolute inset-0" />
          </div>
          <div className="w-[42%] flex flex-col justify-center px-10 py-14">
            <p className="text-sm text-muted-foreground mb-3">{dateRange}</p>
            <h1 className="text-3xl font-bold tracking-tight mb-10">{eventName}</h1>
            <div>
              <RegisterButton slug={eventSlug} isRegistered={isRegistered} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (bannerLayout === "image-below") {
    const darkOverlay = Math.max(0.3, 0.9 - bgOpacity * 0.6);
    return (
      <div className="relative min-h-[560px] overflow-hidden">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} />
            <div className="absolute inset-0" style={{ backgroundColor: `rgba(30,41,59,${darkOverlay})` }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-800" />
        )}
        <div className="relative z-10 max-w-5xl mx-auto pt-14 pb-14 px-6">
          <div className="flex items-center justify-between mb-10 text-white">
            <div>
              <p className="text-sm text-white/60 mb-2">{dateRange}</p>
              <h1 className="text-4xl font-bold tracking-tight">{eventName}</h1>
            </div>
            <RegisterButton slug={eventSlug} isRegistered={isRegistered} />
          </div>
          <div className="rounded-xl overflow-hidden shadow-lg">
            <BannerImage url={bannerUrl} className="w-full h-[380px]" />
          </div>
        </div>
      </div>
    );
  }

  if (bannerLayout === "centered") {
    const darkOverlay = Math.max(0.3, 0.9 - bgOpacity * 0.6);
    return (
      <div className="relative min-h-[580px] overflow-hidden">
        {bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: `blur(${blur}px)`, opacity: bgOpacity }} />
            <div className="absolute inset-0" style={{ backgroundColor: `rgba(30,41,59,${darkOverlay})` }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-800" />
        )}
        <div className="relative z-10 max-w-5xl mx-auto pt-14 pb-14 px-6 text-center text-white">
          <h1 className="text-5xl font-bold tracking-tight mb-3">{eventName}</h1>
          <p className="text-sm text-white/60 mb-8">{dateRange}</p>
          <RegisterButton slug={eventSlug} isRegistered={isRegistered} />
          <div className="mt-10 rounded-xl overflow-hidden shadow-lg max-w-4xl mx-auto">
            <BannerImage url={bannerUrl} className="w-full h-[380px]" />
          </div>
        </div>
      </div>
    );
  }

  // full-bleed
  return (
    <div className="relative min-h-[520px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <BannerImage url={bannerUrl} className="w-full h-full" />
      </div>
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />
      <div className="relative z-10 text-center text-white px-10 py-16">
        <p className="text-sm text-white/70 mb-3">{dateRange}</p>
        <h1 className="text-4xl font-bold tracking-tight mb-8">{eventName}</h1>
        <RegisterButton slug={eventSlug} isRegistered={isRegistered} />
      </div>
    </div>
  );
}
