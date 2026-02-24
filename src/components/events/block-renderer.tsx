"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ExternalLink, Play, Search, Building2, Crown, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ContentBlock, SponsorBlock as SponsorBlockType, ExhibitorDirectoryBlock as ExhibitorDirBlockType, FeaturedSponsorBlock as FeaturedBlockType, SponsorBannerBlock as BannerBlockType } from "@/types/event-pages";
import { cn } from "@/lib/utils";

interface BlockRendererProps {
  blocks: ContentBlock[];
  eventId?: string;
  className?: string;
}

export function BlockRenderer({ blocks, className, eventId }: BlockRendererProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function RenderBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "hero": {
      const overlayClass =
        block.overlay === "dark"
          ? "bg-black/50"
          : block.overlay === "light"
          ? "bg-white/40"
          : block.overlay === "gradient"
          ? "bg-gradient-to-t from-black/70 to-transparent"
          : "";
      return (
        <div
          className="relative rounded-2xl overflow-hidden min-h-[280px] flex items-center"
          style={
            block.backgroundUrl
              ? { backgroundImage: `url(${block.backgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(135deg, var(--page-accent), var(--page-surface))" }
          }
        >
          {block.overlay !== "none" && (
            <div className={`absolute inset-0 ${overlayClass}`} />
          )}
          <div
            className={cn(
              "relative z-10 px-8 py-12 w-full",
              block.alignment === "center" ? "text-center" : "text-left"
            )}
          >
            <h1
              className="text-3xl sm:text-4xl font-bold mb-3"
              style={{ color: block.overlay === "light" ? "var(--page-text)" : "#fff" }}
            >
              {block.title}
            </h1>
            {block.subtitle && (
              <p
                className="text-lg opacity-90 mb-6 max-w-2xl"
                style={{
                  color: block.overlay === "light" ? "var(--page-text-secondary)" : "rgba(255,255,255,0.85)",
                  ...(block.alignment === "center" ? { marginInline: "auto" } : {}),
                }}
              >
                {block.subtitle}
              </p>
            )}
            {block.ctaLabel && (
              <a href={block.ctaHref || "#"}>
                <Button
                  size="lg"
                  className="px-8"
                  style={{ backgroundColor: "var(--page-accent)", color: "#fff" }}
                >
                  {block.ctaLabel}
                </Button>
              </a>
            )}
          </div>
        </div>
      );
    }

    case "stats":
      return (
        <div className="py-6">
          {block.title && (
            <h3
              className="text-lg font-semibold text-center mb-6"
              style={{ color: "var(--page-text)" }}
            >
              {block.title}
            </h3>
          )}
          <div className="flex justify-center gap-12 flex-wrap">
            {block.showParticipants && (
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "var(--page-accent)" }}>--</p>
                <p className="text-sm mt-1" style={{ color: "var(--page-text-secondary)" }}>Participants</p>
              </div>
            )}
            {block.showMeetings && (
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "var(--page-accent)" }}>--</p>
                <p className="text-sm mt-1" style={{ color: "var(--page-text-secondary)" }}>Meetings</p>
              </div>
            )}
            {block.showCountries && (
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "var(--page-accent)" }}>--</p>
                <p className="text-sm mt-1" style={{ color: "var(--page-text-secondary)" }}>Countries</p>
              </div>
            )}
            {block.showMessages && (
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "var(--page-accent)" }}>--</p>
                <p className="text-sm mt-1" style={{ color: "var(--page-text-secondary)" }}>Messages</p>
              </div>
            )}
          </div>
        </div>
      );

    case "rich-text": {
      const bgClass =
        block.background === "surface"
          ? "bg-[var(--page-surface,#F5F5F7)] rounded-2xl px-8 py-8"
          : block.background === "accent"
          ? "bg-[var(--page-accent,#0071E3)]/5 rounded-2xl px-8 py-8"
          : "";
      const proseClass = "prose max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-p:my-4 [&_p:empty]:min-h-[1em] [&_p:has(br:only-child)]:min-h-[1em]";
      const textStyle = {
        color: "var(--page-text)",
        fontFamily: "var(--page-font-body)",
        textAlign: (block.alignment || "left") as "left" | "center" | "right",
      };
      return (
        <div className={bgClass}>
          {block.layout === "two-column" ? (
            <div className="grid grid-cols-2 gap-8">
              <div
                className={proseClass}
                style={textStyle}
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
              <div
                className={proseClass}
                style={textStyle}
                dangerouslySetInnerHTML={{ __html: block.contentRight || "" }}
              />
            </div>
          ) : (
            <div
              className={proseClass}
              style={textStyle}
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          )}
          {block.ctaEnabled && (
            <div className={`mt-6 ${block.alignment === "center" ? "text-center" : block.alignment === "right" ? "text-right" : ""}`}>
              <a
                href={block.ctaHref || "#"}
                className={`inline-block px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  block.ctaStyle === "outline"
                    ? "border border-[var(--page-accent)] text-[var(--page-accent)]"
                    : block.ctaStyle === "secondary"
                    ? "bg-[var(--page-surface)] text-[var(--page-text)]"
                    : "bg-[var(--page-accent)] text-white"
                }`}
              >
                {block.ctaLabel || "Learn More"}
              </a>
            </div>
          )}
        </div>
      );
    }

    case "image":
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.alt}
            className="w-full rounded-xl object-cover"
            loading="lazy"
          />
          {block.caption && (
            <figcaption
              className="mt-2 text-center text-sm"
              style={{ color: "var(--page-text-secondary)" }}
            >
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "gallery":
      return (
        <div
          className={cn(
            "grid gap-3",
            block.columns === 2 && "grid-cols-2",
            block.columns === 4 && "grid-cols-2 sm:grid-cols-4",
            (!block.columns || block.columns === 3) && "grid-cols-2 sm:grid-cols-3"
          )}
        >
          {block.images.map((img, i) => (
            <figure key={i} className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt}
                className="w-full aspect-[4/3] object-cover hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      );

    case "video":
      return <VideoEmbed url={block.url} title={block.title} />;

    case "faq":
      return (
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <FaqAccordion key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      );

    case "cta":
      return (
        <div className="flex justify-center py-2">
          <a href={block.href} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              variant={block.style === "outline" ? "outline" : block.style === "secondary" ? "secondary" : "default"}
              className="px-8"
              style={
                block.style === "primary"
                  ? { backgroundColor: "var(--page-accent)", color: "#fff" }
                  : undefined
              }
            >
              {block.label}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      );

    case "divider":
      return (
        <hr
          className="border-t"
          style={{ borderColor: "var(--page-border)" }}
        />
      );

    case "sponsor":
      return <SponsorLogosBlock block={block} />;

    case "exhibitor-directory":
      return <ExhibitorDirectoryBlock block={block} />;

    case "featured-sponsor":
      return <FeaturedSponsorBlockRenderer block={block} />;

    case "sponsor-banner":
      return <SponsorBannerBlockRenderer block={block} />;

    default:
      return null;
  }
}

function FaqAccordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--page-border)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-left font-medium text-sm hover:opacity-80 transition-opacity"
        style={{ color: "var(--page-text)" }}
      >
        {question}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 ml-2 transition-transform duration-200",
            open && "rotate-180"
          )}
          style={{ color: "var(--page-text-secondary)" }}
        />
      </button>
      {open && (
        <div
          className="px-5 pb-4 text-sm leading-relaxed"
          style={{ color: "var(--page-text-secondary)" }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}

function VideoEmbed({ url, title }: { url: string; title?: string }) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ borderColor: "var(--page-border)" }}
      >
        <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm" style={{ color: "var(--page-text-secondary)" }}>
          Invalid video URL
        </p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3
          className="text-lg font-semibold mb-3"
          style={{ color: "var(--page-text)" }}
        >
          {title}
        </h3>
      )}
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || "Video"}
        />
      </div>
    </div>
  );
}

// ============================================================
// Partner Block Components (Sponsor Logos, Exhibitor Directory, etc.)
// ============================================================

function useEventIdFromParams(): string | null {
  const params = useParams();
  return (params?.eventId as string) || (params?.id as string) || null;
}

function SponsorLogosBlock({ block }: { block: SponsorBlockType }) {
  const eventId = useEventIdFromParams();
  const [data, setData] = useState<{ grouped: any[]; tiers: any[] } | null>(null);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}/sponsors`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [eventId]);

  if (!data || (!data.grouped?.length && !data.tiers?.length)) {
    return (
      <div className="text-center py-4">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--page-text-secondary)" }}>
          {block.title || "Our Sponsors"}
        </p>
        <p className="text-xs" style={{ color: "var(--page-text-secondary)" }}>
          Sponsor logos will appear here once added.
        </p>
      </div>
    );
  }

  const logoSizeClass = block.logoSize === "lg" ? "h-16" : block.logoSize === "sm" ? "h-8" : "h-12";

  return (
    <div className="py-6">
      <p className="text-sm font-medium text-center mb-6" style={{ color: "var(--page-text-secondary)" }}>
        {block.title || "Our Sponsors"}
      </p>
      {data.grouped.map((group: any) => {
        if (!group.sponsors?.length) return null;
        if (block.tierFilter?.length && !block.tierFilter.includes(group.tier.id)) return null;
        return (
          <div key={group.tier.id} className="mb-6 last:mb-0">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: group.tier.color }} />
              <span className="text-xs font-medium" style={{ color: "var(--page-text-secondary)" }}>
                {group.tier.name}
              </span>
            </div>
            <div className={cn(
              "flex flex-wrap items-center justify-center",
              block.layout === "row" ? "gap-8" : "gap-6"
            )}>
              {group.sponsors.map((sponsor: any) => (
                <a
                  key={sponsor.id}
                  href={`sponsors/${sponsor.slug}`}
                  className="transition-opacity hover:opacity-80"
                >
                  {sponsor.logo_url ? (
                    <img src={sponsor.logo_url} alt={sponsor.name} className={cn(logoSizeClass, "object-contain")} />
                  ) : (
                    <span className="text-sm font-medium px-4 py-2 rounded-lg" style={{ backgroundColor: "var(--page-surface)", color: "var(--page-text)" }}>
                      {sponsor.name}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExhibitorDirectoryBlock({ block }: { block: ExhibitorDirBlockType }) {
  const eventId = useEventIdFromParams();
  const [data, setData] = useState<{ exhibitors: any[]; categories: string[] } | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!eventId) return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    fetch(`/api/events/${eventId}/exhibitors?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [eventId, search, category]);

  const cols = block.columns || 3;

  return (
    <div className="py-6">
      <p className="text-lg font-semibold mb-4" style={{ color: "var(--page-text)" }}>
        {block.title || "Exhibitors"}
      </p>
      {(block.showSearch || block.showCategoryFilter) && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {block.showSearch && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
              <input
                placeholder="Search exhibitors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border text-sm"
                style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-surface)", color: "var(--page-text)" }}
              />
            </div>
          )}
          {block.showCategoryFilter && data?.categories?.length ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 px-3 rounded-lg border text-sm"
              style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-surface)", color: "var(--page-text)" }}
            >
              <option value="">All categories</option>
              {data.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          ) : null}
        </div>
      )}
      {!data?.exhibitors?.length ? (
        <div className="text-center py-8">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm" style={{ color: "var(--page-text-secondary)" }}>No exhibitors yet.</p>
        </div>
      ) : (
        <div className={cn("grid gap-4", cols === 2 && "grid-cols-2", cols === 3 && "grid-cols-2 sm:grid-cols-3", cols === 4 && "grid-cols-2 sm:grid-cols-4")}>
          {data.exhibitors.map((ex: any) => {
            const ep = Array.isArray(ex.exhibitor_profiles) ? ex.exhibitor_profiles[0] : ex.exhibitor_profiles;
            return (
              <a
                key={ex.id}
                href={`exhibitors/${ex.slug}`}
                className="rounded-xl border p-4 transition-all hover:shadow-md"
                style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-surface)" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  {ex.logo_url ? (
                    <img src={ex.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: "var(--page-accent)", color: "#fff", opacity: 0.8 }}>
                      {ex.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--page-text)" }}>{ex.name}</p>
                    {ep?.booth_number && (
                      <p className="text-xs" style={{ color: "var(--page-text-secondary)" }}>Booth {ep.booth_number}</p>
                    )}
                  </div>
                </div>
                {ex.description_short && (
                  <p className="text-xs line-clamp-2" style={{ color: "var(--page-text-secondary)" }}>{ex.description_short}</p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeaturedSponsorBlockRenderer({ block }: { block: FeaturedBlockType }) {
  const eventId = useEventIdFromParams();
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (!eventId || !block.companyId) return;
    fetch(`/api/events/${eventId}/companies/${block.companyId}`)
      .then((r) => r.json())
      .then((d) => setCompany(d.company))
      .catch(() => {});
  }, [eventId, block.companyId]);

  if (!company) {
    return (
      <div className="text-center py-6">
        <p className="text-xs" style={{ color: "var(--page-text-secondary)" }}>Select a sponsor to feature.</p>
      </div>
    );
  }

  const sp = Array.isArray(company.sponsor_profiles) ? company.sponsor_profiles[0] : company.sponsor_profiles;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--page-surface)" }}>
      {company.banner_url && (
        <div className="h-32 overflow-hidden">
          <img src={company.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-4 mb-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-xl flex items-center justify-center text-lg font-bold" style={{ backgroundColor: "var(--page-accent)", color: "#fff" }}>
              {company.name[0]}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold" style={{ color: "var(--page-text)" }}>{company.name}</p>
            {sp?.tagline && <p className="text-sm" style={{ color: "var(--page-text-secondary)" }}>{sp.tagline}</p>}
          </div>
        </div>
        {company.description_short && (
          <p className="text-sm mb-4" style={{ color: "var(--page-text-secondary)" }}>{company.description_short}</p>
        )}
        {sp?.cta_buttons?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {sp.cta_buttons.map((cta: any, i: number) => (
              <a key={i} href={cta.url} target="_blank" rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  cta.style === "outline" ? "border" : cta.style === "secondary" ? "" : "text-white"
                )}
                style={cta.style === "primary" ? { backgroundColor: "var(--page-accent)" } : cta.style === "outline" ? { borderColor: "var(--page-accent)", color: "var(--page-accent)" } : { backgroundColor: "var(--page-surface)" }}
              >
                {cta.label} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SponsorBannerBlockRenderer({ block }: { block: BannerBlockType }) {
  const eventId = useEventIdFromParams();
  const [banners, setBanners] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}/sponsors`)
      .then((r) => r.json())
      .then((data) => {
        const allSponsors: any[] = [];
        (data.grouped || []).forEach((g: any) => {
          if (block.tierFilter?.length && !block.tierFilter.includes(g.tier.id)) return;
          g.sponsors?.forEach((s: any) => {
            if (s.banner_url) allSponsors.push(s);
          });
        });
        setBanners(allSponsors);
      })
      .catch(() => {});
  }, [eventId, block.tierFilter]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const sponsor = banners[current];
  return (
    <a
      href={`sponsors/${sponsor.slug}`}
      className="block rounded-xl overflow-hidden transition-all hover:shadow-md"
    >
      <img src={sponsor.banner_url} alt={sponsor.name} className="w-full h-32 object-cover" />
    </a>
  );
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}
