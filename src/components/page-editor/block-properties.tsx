"use client";

import { useState, useRef, useCallback } from "react";
import {
  Trash2,
  Upload,
  Loader2,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentBlock } from "@/types/event-pages";
import { cn } from "@/lib/utils";

interface BlockPropertiesProps {
  block: ContentBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onRemove: () => void;
  eventId: string;
}

export function BlockProperties({
  block,
  onUpdate,
  onRemove,
  eventId,
}: BlockPropertiesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">
          {block.type.replace("-", " ")} Block
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-7 px-2"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Remove
        </Button>
      </div>

      <div className="border-t pt-4">
        <BlockFields block={block} onUpdate={onUpdate} eventId={eventId} />
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onUpdate,
  eventId,
}: {
  block: ContentBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  eventId: string;
}) {
  switch (block.type) {
    case "hero":
      return <HeroFields block={block} onUpdate={onUpdate} eventId={eventId} />;
    case "rich-text":
      return (
        <div className="space-y-3">
          <Label className="text-xs">Content (HTML supported)</Label>
          <textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Enter text content..."
            rows={8}
            className="flex w-full rounded-lg bg-input/50 px-3 py-2 text-sm border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-y font-mono"
          />
        </div>
      );
    case "image":
      return <ImageFields block={block} onUpdate={onUpdate} eventId={eventId} />;
    case "gallery":
      return <GalleryFields block={block} onUpdate={onUpdate} eventId={eventId} />;
    case "video":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Video URL</Label>
            <Input
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="YouTube or Vimeo URL..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Title (optional)</Label>
            <Input
              value={block.title || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Video title"
              className="mt-1"
            />
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Section title</Label>
            <Input
              value={block.title || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Event at a Glance"
              className="mt-1"
            />
          </div>
          <Label className="text-xs">Show stats</Label>
          <div className="space-y-2">
            {[
              { key: "showParticipants", label: "Participants" },
              { key: "showMeetings", label: "Meetings" },
              { key: "showCountries", label: "Countries" },
              { key: "showMessages", label: "Messages" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(block as any)[key] ?? false}
                  onChange={(e) => onUpdate({ [key]: e.target.checked })}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      );
    case "faq":
      return <FaqFields block={block} onUpdate={onUpdate} />;
    case "cta":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Button text</Label>
            <Input
              value={block.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Learn More"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Link URL</Label>
            <Input
              value={block.href}
              onChange={(e) => onUpdate({ href: e.target.value })}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Style</Label>
            <select
              value={block.style}
              onChange={(e) =>
                onUpdate({
                  style: e.target.value as "primary" | "secondary" | "outline",
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-border bg-input/50 px-3 text-sm"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="outline">Outline</option>
            </select>
          </div>
        </div>
      );
    case "sponsor":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Section title</Label>
            <Input
              value={block.title || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Our Sponsors"
              className="mt-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Sponsor logos will be auto-populated from the event&apos;s sponsor data when available.
          </p>
        </div>
      );
    case "divider":
      return (
        <p className="text-xs text-muted-foreground">
          A simple horizontal line separator. No additional settings.
        </p>
      );
    default:
      return null;
  }
}

function HeroFields({
  block,
  onUpdate,
  eventId,
}: {
  block: ContentBlock & { type: "hero" };
  onUpdate: (updates: Partial<ContentBlock>) => void;
  eventId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);
      fd.append("type", "hero");
      const res = await fetch("/api/events/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) onUpdate({ backgroundUrl: data.url });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={block.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Subtitle</Label>
        <Input
          value={block.subtitle || ""}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">CTA button text</Label>
        <Input
          value={block.ctaLabel || ""}
          onChange={(e) => onUpdate({ ctaLabel: e.target.value })}
          placeholder="Register Now"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">CTA link</Label>
        <Input
          value={block.ctaHref || ""}
          onChange={(e) => onUpdate({ ctaHref: e.target.value })}
          placeholder="/register or https://..."
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Background image</Label>
        {block.backgroundUrl ? (
          <div className="mt-1 relative rounded-lg overflow-hidden bg-muted h-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.backgroundUrl}
              alt="Hero background"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onUpdate({ backgroundUrl: undefined })}
              className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded p-1 hover:bg-black/80"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-1 w-full h-20 rounded-lg border border-dashed border-border/60 flex flex-col items-center justify-center hover:border-primary/30 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Upload</span>
              </>
            )}
          </button>
        )}
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
      </div>
      <div>
        <Label className="text-xs">Overlay</Label>
        <select
          value={block.overlay || "dark"}
          onChange={(e) =>
            onUpdate({
              overlay: e.target.value as "none" | "light" | "dark" | "gradient",
            })
          }
          className="mt-1 h-9 w-full rounded-lg border border-border bg-input/50 px-3 text-sm"
        >
          <option value="none">None</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="gradient">Gradient</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Alignment</Label>
        <div className="flex gap-2 mt-1">
          {(["left", "center"] as const).map((align) => (
            <button
              key={align}
              onClick={() => onUpdate({ alignment: align })}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg border transition-colors capitalize",
                block.alignment === align
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/30"
              )}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageFields({
  block,
  onUpdate,
  eventId,
}: {
  block: ContentBlock & { type: "image" };
  onUpdate: (updates: Partial<ContentBlock>) => void;
  eventId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);
      fd.append("type", "content");
      const res = await fetch("/api/events/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        onUpdate({ url: data.url, alt: file.name.replace(/\.[^.]+$/, "") });
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Image</Label>
        {block.url ? (
          <div className="mt-1 relative rounded-lg overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.url}
              alt={block.alt}
              className="w-full max-h-32 object-cover"
            />
            <button
              onClick={() => onUpdate({ url: "", alt: "" })}
              className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded p-1 hover:bg-black/80"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-1 w-full h-20 rounded-lg border border-dashed border-border/60 flex flex-col items-center justify-center hover:border-primary/30 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Upload</span>
              </>
            )}
          </button>
        )}
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
      </div>
      <div>
        <Label className="text-xs">Alt text</Label>
        <Input
          value={block.alt}
          onChange={(e) => onUpdate({ alt: e.target.value })}
          placeholder="Describe the image"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Caption</Label>
        <Input
          value={block.caption || ""}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          placeholder="Optional caption"
          className="mt-1"
        />
      </div>
    </div>
  );
}

function GalleryFields({
  block,
  onUpdate,
  eventId,
}: {
  block: ContentBlock & { type: "gallery" };
  onUpdate: (updates: Partial<ContentBlock>) => void;
  eventId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);
      fd.append("type", "gallery");
      const res = await fetch("/api/events/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        const images = [
          ...block.images,
          { url: data.url, alt: file.name.replace(/\.[^.]+$/, "") },
        ];
        onUpdate({ images });
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Columns</Label>
        <select
          value={block.columns || 3}
          onChange={(e) =>
            onUpdate({ columns: Number(e.target.value) as 2 | 3 | 4 })
          }
          className="mt-1 h-9 w-full rounded-lg border border-border bg-input/50 px-3 text-sm"
        >
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
          <option value={4}>4 columns</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Images ({block.images.length})</Label>
        {block.images.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {block.images.map((img, i) => (
              <div
                key={i}
                className="relative group/img rounded-lg overflow-hidden bg-muted aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    const images = block.images.filter((_, idx) => idx !== i);
                    onUpdate({ images });
                  }}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-2 w-full h-10 rounded-lg border border-dashed border-border/60 flex items-center justify-center hover:border-primary/30 transition-colors text-xs text-muted-foreground"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "+ Add image"
          )}
        </button>
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
      </div>
    </div>
  );
}

function FaqFields({
  block,
  onUpdate,
}: {
  block: ContentBlock & { type: "faq" };
  onUpdate: (updates: Partial<ContentBlock>) => void;
}) {
  return (
    <div className="space-y-3">
      {block.items.map((item, i) => (
        <div key={i} className="space-y-1.5 pl-3 border-l-2 border-border/40">
          <div className="flex gap-2">
            <Input
              value={item.question}
              onChange={(e) => {
                const items = block.items.map((it, idx) =>
                  idx === i ? { ...it, question: e.target.value } : it
                );
                onUpdate({ items });
              }}
              placeholder="Question"
              className="text-sm font-medium"
            />
            <button
              onClick={() => {
                const items = block.items.filter((_, idx) => idx !== i);
                onUpdate({ items });
              }}
              className="text-muted-foreground hover:text-destructive p-1 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            value={item.answer}
            onChange={(e) => {
              const items = block.items.map((it, idx) =>
                idx === i ? { ...it, answer: e.target.value } : it
              );
              onUpdate({ items });
            }}
            placeholder="Answer"
            rows={2}
            className="flex w-full rounded-lg bg-input/50 px-3 py-2 text-sm border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-y"
          />
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onUpdate({
            items: [...block.items, { question: "", answer: "" }],
          })
        }
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" /> Add Q&A
      </Button>
    </div>
  );
}
