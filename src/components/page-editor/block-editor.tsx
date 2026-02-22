"use client";

import { useState, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  Image as ImageIcon,
  Video,
  HelpCircle,
  MousePointerClick,
  Minus,
  Grid3X3,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContentBlock, BlockType } from "@/types/event-pages";
import { cn } from "@/lib/utils";
import { randomId } from "@/lib/utils";

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "rich-text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { type: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
  { type: "gallery", label: "Gallery", icon: <Grid3X3 className="h-4 w-4" /> },
  { type: "video", label: "Video", icon: <Video className="h-4 w-4" /> },
  { type: "faq", label: "FAQ", icon: <HelpCircle className="h-4 w-4" /> },
  { type: "cta", label: "Button", icon: <MousePointerClick className="h-4 w-4" /> },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
];

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  eventId: string;
}

export function BlockEditor({ blocks, onChange, eventId }: BlockEditorProps) {
  function addBlock(type: BlockType, index?: number) {
    const id = randomId();
    let newBlock: ContentBlock;

    switch (type) {
      case "rich-text":
        newBlock = { id, type: "rich-text", content: "" };
        break;
      case "image":
        newBlock = { id, type: "image", url: "", alt: "" };
        break;
      case "gallery":
        newBlock = { id, type: "gallery", images: [], columns: 3 };
        break;
      case "video":
        newBlock = { id, type: "video", url: "" };
        break;
      case "faq":
        newBlock = { id, type: "faq", items: [{ question: "", answer: "" }] };
        break;
      case "cta":
        newBlock = { id, type: "cta", label: "Learn More", href: "", style: "primary" };
        break;
      case "divider":
        newBlock = { id, type: "divider" };
        break;
      default:
        return;
    }

    const updated = [...blocks];
    if (index !== undefined) {
      updated.splice(index + 1, 0, newBlock);
    } else {
      updated.push(newBlock);
    }
    onChange(updated);
  }

  function updateBlock(id: string, updates: Partial<ContentBlock>) {
    onChange(
      blocks.map((b) => (b.id === id ? { ...b, ...updates } as ContentBlock : b))
    );
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No content blocks yet. Add your first block to get started.
          </p>
          <AddBlockDropdown onAdd={(type) => addBlock(type)} />
        </div>
      )}

      {blocks.map((block, index) => (
        <div key={block.id} className="group relative">
          <Card className="transition-all duration-150 group-hover:border-primary/20">
            <CardContent className="pt-4 pb-4">
              {/* Block header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5 text-xs"
                  >
                    ↓
                  </button>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {block.type.replace("-", " ")}
                </Badge>
                <div className="flex-1" />
                <button
                  onClick={() => removeBlock(block.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Block-specific editor */}
              <BlockEditorField
                block={block}
                onUpdate={(updates) => updateBlock(block.id, updates)}
                eventId={eventId}
              />
            </CardContent>
          </Card>

          {/* Insert between blocks */}
          <div className="flex justify-center -mb-1.5 mt-1">
            <AddBlockDropdown
              onAdd={(type) => addBlock(type, index)}
              compact
            />
          </div>
        </div>
      ))}

      {blocks.length > 0 && (
        <div className="flex justify-center pt-2">
          <AddBlockDropdown onAdd={(type) => addBlock(type)} />
        </div>
      )}
    </div>
  );
}

function AddBlockDropdown({
  onAdd,
  compact = false,
}: {
  onAdd: (type: BlockType) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size="sm"
          className={cn(
            compact && "h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          )}
        >
          <Plus className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
          {!compact && "Add block"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {BLOCK_TYPES.map((bt) => (
          <DropdownMenuItem key={bt.type} onClick={() => onAdd(bt.type)}>
            {bt.icon}
            <span className="ml-2">{bt.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BlockEditorField({
  block,
  onUpdate,
  eventId,
}: {
  block: ContentBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  eventId: string;
}) {
  switch (block.type) {
    case "rich-text":
      return (
        <textarea
          value={block.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Enter text content (HTML supported)..."
          rows={4}
          className="flex w-full rounded-lg bg-input/50 px-4 py-3 text-sm border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-y font-mono"
        />
      );

    case "image":
      return <ImageBlockEditor block={block} onUpdate={onUpdate} eventId={eventId} />;

    case "gallery":
      return <GalleryBlockEditor block={block} onUpdate={onUpdate} eventId={eventId} />;

    case "video":
      return (
        <div className="space-y-2">
          <Input
            value={block.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="YouTube or Vimeo URL..."
          />
          <Input
            value={block.title || ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Video title (optional)"
          />
        </div>
      );

    case "faq":
      return <FaqBlockEditor block={block} onUpdate={onUpdate} />;

    case "cta":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={block.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Button text"
          />
          <Input
            value={block.href}
            onChange={(e) => onUpdate({ href: e.target.value })}
            placeholder="Link URL"
          />
          <select
            value={block.style}
            onChange={(e) => onUpdate({ style: e.target.value as "primary" | "secondary" | "outline" })}
            className="h-9 rounded-lg border border-border bg-input/50 px-3 text-sm"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="outline">Outline</option>
          </select>
        </div>
      );

    case "divider":
      return (
        <div className="flex items-center justify-center py-1">
          <hr className="w-full border-t border-border/60" />
        </div>
      );

    default:
      return null;
  }
}

function ImageBlockEditor({
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

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("eventId", eventId);
        fd.append("type", "content");

        const res = await fetch("/api/events/upload-image", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) {
          onUpdate({ url: data.url, alt: file.name.replace(/\.[^.]+$/, "") });
        }
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [eventId, onUpdate]
  );

  return (
    <div className="space-y-2">
      {block.url ? (
        <div className="relative rounded-lg overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt} className="w-full max-h-48 object-cover" />
          <button
            onClick={() => onUpdate({ url: "", alt: "" })}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-md p-1.5 hover:bg-black/80 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border border-dashed border-border/60 p-6 text-center hover:border-primary/30 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload image</p>
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
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={block.alt}
          onChange={(e) => onUpdate({ alt: e.target.value })}
          placeholder="Alt text"
        />
        <Input
          value={block.caption || ""}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          placeholder="Caption (optional)"
        />
      </div>
    </div>
  );
}

function GalleryBlockEditor({
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

      const res = await fetch("/api/events/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        const images = [...block.images, { url: data.url, alt: file.name.replace(/\.[^.]+$/, "") }];
        onUpdate({ images });
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    const images = block.images.filter((_, i) => i !== index);
    onUpdate({ images });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={block.columns || 3}
          onChange={(e) => onUpdate({ columns: Number(e.target.value) as 2 | 3 | 4 })}
          className="h-8 rounded-lg border border-border bg-input/50 px-2 text-xs"
        >
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
          <option value={4}>4 columns</option>
        </select>
        <span className="text-xs text-muted-foreground">{block.images.length} images</span>
      </div>

      {block.images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {block.images.map((img, i) => (
            <div key={i} className="relative group/img rounded-lg overflow-hidden bg-muted aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded p-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-lg border border-dashed border-border/60 p-4 text-center hover:border-primary/30 transition-colors text-sm text-muted-foreground"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
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
  );
}

function FaqBlockEditor({
  block,
  onUpdate,
}: {
  block: ContentBlock & { type: "faq" };
  onUpdate: (updates: Partial<ContentBlock>) => void;
}) {
  function updateItem(index: number, field: "question" | "answer", value: string) {
    const items = block.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onUpdate({ items });
  }

  function addItem() {
    onUpdate({ items: [...block.items, { question: "", answer: "" }] });
  }

  function removeItem(index: number) {
    onUpdate({ items: block.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      {block.items.map((item, i) => (
        <div key={i} className="space-y-1.5 pl-3 border-l-2 border-border/40">
          <div className="flex gap-2">
            <Input
              value={item.question}
              onChange={(e) => updateItem(i, "question", e.target.value)}
              placeholder="Question"
              className="text-sm font-medium"
            />
            <button
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            value={item.answer}
            onChange={(e) => updateItem(i, "answer", e.target.value)}
            placeholder="Answer"
            rows={2}
            className="flex w-full rounded-lg bg-input/50 px-3 py-2 text-sm border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-y"
          />
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addItem} className="text-xs">
        <Plus className="h-3 w-3 mr-1" /> Add Q&A
      </Button>
    </div>
  );
}
