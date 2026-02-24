"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentBlock } from "@/types/event-pages";
import { cn } from "@/lib/utils";

interface BlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

export function BlockRenderer({ blocks, className }: BlockRendererProps) {
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
      const proseClass = "prose max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed";
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
      return (
        <div className="text-center py-4">
          <p
            className="text-sm font-medium mb-4"
            style={{ color: "var(--page-text-secondary)" }}
          >
            {block.title || "Our Sponsors"}
          </p>
          <p className="text-xs" style={{ color: "var(--page-text-secondary)" }}>
            Sponsor logos will appear here once added.
          </p>
        </div>
      );

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
