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
    case "rich-text":
      return (
        <div
          className="prose max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed"
          style={{
            color: "var(--page-text)",
            fontFamily: "var(--page-font-body)",
          }}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

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
