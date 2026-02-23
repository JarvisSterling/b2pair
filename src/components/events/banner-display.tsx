"use client";

import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

type BannerLayout = "split" | "image-below" | "centered" | "full-bleed";

interface BannerDisplayProps {
  eventName: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  bannerLayout: BannerLayout;
  eventSlug: string;
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

function RegisterButton({ slug }: { slug: string }) {
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
  eventSlug,
}: BannerDisplayProps) {
  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;

  if (bannerLayout === "split") {
    return (
      <div className="flex min-h-[320px] rounded-2xl overflow-hidden border border-border/60 bg-background">
        <div className="w-[58%] relative">
          <BannerImage url={bannerUrl} className="w-full h-full absolute inset-0" />
        </div>
        <div className="w-[42%] flex flex-col justify-center px-10 py-12">
          <p className="text-sm text-muted-foreground mb-2">{dateRange}</p>
          <h1 className="text-3xl font-bold tracking-tight mb-8">{eventName}</h1>
          <div>
            <RegisterButton slug={eventSlug} />
          </div>
        </div>
      </div>
    );
  }

  if (bannerLayout === "image-below") {
    return (
      <div className="rounded-2xl overflow-hidden bg-slate-800 text-white">
        <div className="flex items-center justify-between px-10 pt-10 pb-6">
          <div>
            <p className="text-sm text-white/60 mb-1">{dateRange}</p>
            <h1 className="text-3xl font-bold tracking-tight">{eventName}</h1>
          </div>
          <RegisterButton slug={eventSlug} />
        </div>
        <div className="px-10 pb-10">
          <div className="rounded-xl overflow-hidden shadow-lg">
            <BannerImage url={bannerUrl} className="w-full h-[300px]" />
          </div>
        </div>
      </div>
    );
  }

  if (bannerLayout === "centered") {
    return (
      <div className="rounded-2xl overflow-hidden bg-slate-800 text-white text-center">
        <div className="px-10 pt-12 pb-6">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{eventName}</h1>
          <p className="text-sm text-white/60 mb-6">{dateRange}</p>
          <RegisterButton slug={eventSlug} />
        </div>
        <div className="px-10 pb-10 pt-4">
          <div className="rounded-xl overflow-hidden shadow-lg max-w-3xl mx-auto">
            <BannerImage url={bannerUrl} className="w-full h-[300px]" />
          </div>
        </div>
      </div>
    );
  }

  // full-bleed
  return (
    <div className="relative min-h-[380px] flex items-center justify-center rounded-2xl overflow-hidden">
      <div className="absolute inset-0">
        <BannerImage url={bannerUrl} className="w-full h-full" />
      </div>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 text-center text-white px-10 py-16">
        <p className="text-sm text-white/70 mb-3">{dateRange}</p>
        <h1 className="text-4xl font-bold tracking-tight mb-8">{eventName}</h1>
        <RegisterButton slug={eventSlug} />
      </div>
    </div>
  );
}
