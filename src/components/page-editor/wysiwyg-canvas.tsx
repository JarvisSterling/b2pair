"use client";

import { useCallback, useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  Type,
  Image as ImageIcon,
  Video,
  HelpCircle,
  MousePointerClick,
  Minus,
  Grid3X3,
  BarChart3,
  Layout,
  Award,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlockRenderer } from "@/components/events/block-renderer";
import { BannerEditor, type BannerLayout } from "@/components/page-editor/banner-editor";
import { InlineTextEditor } from "@/components/page-editor/inline-text-editor";
import type { RichTextBlock } from "@/types/event-pages";
import { EventThemeProvider } from "@/components/events/theme-provider";
import type { ContentBlock, BlockType, ThemeKey, EventPage } from "@/types/event-pages";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";

interface WysiwygCanvasProps {
  page: EventPage;
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onRemoveBlock: (id: string) => void;
  onAddBlock: (type: BlockType, index?: number) => void;
  // Banner props
  event: any;
  bannerUrl: string | null;
  bannerLayout: BannerLayout;
  bannerSettings: Record<string, any>;
  onBannerUrlChange: (url: string | null) => void;
  onBannerLayoutChange: (layout: BannerLayout) => void;
  onBannerSelect: () => void;
  bannerSelected: boolean;
  // Theme
  themeKey: ThemeKey;
  accentColor: string | null;
}

export function WysiwygCanvas({
  page,
  blocks,
  onChange,
  selectedBlockId,
  onSelectBlock,
  onRemoveBlock,
  onAddBlock,
  event,
  bannerUrl,
  bannerLayout,
  bannerSettings,
  onBannerUrlChange,
  onBannerLayoutChange,
  onBannerSelect,
  bannerSelected,
  themeKey,
  accentColor,
}: WysiwygCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const updated = [...blocks];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      onChange(updated);
    },
    [blocks, onChange]
  );

  return (
    <div className="bg-background min-h-full">
      <EventThemeProvider themeKey={themeKey} accentColor={accentColor}>
        {/* Banner - always visible across all pages */}
        {(
          <div
            onClick={() => onBannerSelect()}
            className={cn(
              "cursor-pointer transition-all",
              bannerSelected && "ring-2 ring-primary/40"
            )}
          >
            <BannerEditor
              eventName={event.name}
              startDate={event.start_date}
              endDate={event.end_date}
              bannerUrl={bannerUrl}
              bannerLayout={bannerLayout}
              bannerSettings={bannerSettings}
              onBannerUrlChange={onBannerUrlChange}
              onBannerLayoutChange={onBannerLayoutChange}
              eventId={event.id}
            />
          </div>
        )}

        {/* Content blocks */}
        <div className="max-w-3xl mx-auto px-6 py-10">
          {blocks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border/40 p-12 text-center">
              <p className="text-muted-foreground mb-2">
                This page is empty
              </p>
              <p className="text-sm text-muted-foreground/60 mb-6">
                Add content blocks from the left panel
              </p>
              <InsertDropdown onAdd={(type) => onAddBlock(type)} />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {blocks.map((block, index) => (
                    <SortableLiveBlock
                      key={block.id}
                      block={block}
                      isSelected={block.id === selectedBlockId}
                      onSelect={() => onSelectBlock(block.id)}
                      onRemove={() => onRemoveBlock(block.id)}
                      onInsertAfter={(type) => onAddBlock(type, index + 1)}
                      onUpdateBlock={(updates) => {
                        const updated = blocks.map((b) =>
                          b.id === block.id ? { ...b, ...updates } as ContentBlock : b
                        );
                        onChange(updated);
                      }}
                      eventId={event.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </EventThemeProvider>
    </div>
  );
}

function SortableLiveBlock({
  block,
  isSelected,
  onSelect,
  onRemove,
  onInsertAfter,
  onUpdateBlock,
  eventId,
}: {
  block: ContentBlock;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onInsertAfter: (type: BlockType) => void;
  onUpdateBlock: (updates: Partial<ContentBlock>) => void;
  eventId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/block relative">
      {/* Clickable wrapper with selection ring */}
      <div
        onClick={onSelect}
        className={cn(
          "relative rounded-xl transition-all duration-150 cursor-pointer",
          isSelected
            ? "ring-2 ring-primary/40 ring-offset-2"
            : "hover:ring-2 hover:ring-primary/20 hover:ring-offset-1",
          isDragging && "opacity-40"
        )}
      >
        {/* Floating toolbar - only visible on hover/select */}
        <div
          className={cn(
            "absolute -top-3 -right-2 z-20 flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-md px-1 py-0.5 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"
          )}
        >
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-muted-foreground hover:text-destructive p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Render the actual block — inline editable for text/image/gallery blocks */}
        {block.type === "rich-text" ? (
          <RichTextLiveBlock
            block={block as RichTextBlock}
            onUpdate={onUpdateBlock}
          />
        ) : block.type === "image" ? (
          <ImageLiveBlock
            block={block as import("@/types/event-pages").ImageBlock}
            onUpdate={onUpdateBlock}
            eventId={eventId}
          />
        ) : block.type === "gallery" ? (
          <GalleryLiveBlock
            block={block as import("@/types/event-pages").GalleryBlock}
            onUpdate={onUpdateBlock}
            eventId={eventId}
          />
        ) : (
          <div className="pointer-events-none">
            <BlockRenderer blocks={[block]} />
          </div>
        )}
      </div>

      {/* Insert point between blocks */}
      <div className="flex justify-center py-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <InsertDropdown onAdd={onInsertAfter} compact />
      </div>
    </div>
  );
}

function InsertDropdown({
  onAdd,
  compact = false,
}: {
  onAdd: (type: BlockType) => void;
  compact?: boolean;
}) {
  const items: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: "hero", label: "Hero", icon: <Layout className="h-4 w-4" /> },
    { type: "rich-text", label: "Text", icon: <Type className="h-4 w-4" /> },
    { type: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
    { type: "gallery", label: "Gallery", icon: <Grid3X3 className="h-4 w-4" /> },
    { type: "video", label: "Video", icon: <Video className="h-4 w-4" /> },
    { type: "stats", label: "Stats", icon: <BarChart3 className="h-4 w-4" /> },
    { type: "faq", label: "FAQ", icon: <HelpCircle className="h-4 w-4" /> },
    { type: "cta", label: "Button", icon: <MousePointerClick className="h-4 w-4" /> },
    { type: "sponsor", label: "Sponsors", icon: <Award className="h-4 w-4" /> },
    { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size="sm"
          className={cn(compact && "h-5 w-5 p-0 rounded-full")}
        >
          <Plus className={cn("h-3 w-3", !compact && "mr-1.5")} />
          {!compact && "Add block"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {items.map((item) => (
          <DropdownMenuItem key={item.type} onClick={() => onAdd(item.type)}>
            {item.icon}
            <span className="ml-2">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Rich Text Live Block with inline editing ─── */
function RichTextLiveBlock({
  block,
  onUpdate,
}: {
  block: RichTextBlock;
  onUpdate: (updates: Partial<RichTextBlock>) => void;
}) {
  const bgClass =
    block.background === "surface"
      ? "bg-[var(--page-surface,#F5F5F7)] rounded-2xl px-8 py-8"
      : block.background === "accent"
      ? "bg-[var(--page-accent,#0071E3)]/5 rounded-2xl px-8 py-8"
      : "";

  return (
    <div className={bgClass} style={{ textAlign: block.alignment || "left" }}>
      {block.layout === "two-column" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-dashed border-border/60 p-4 min-h-[120px] hover:border-primary/30 transition-colors">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Left column</p>
            <InlineTextEditor
              key={`${block.id}-left`}
              content={block.content}
              onChange={(html) => onUpdate({ content: html })}
              alignment={block.alignment}
              placeholder="Click to start writing..."
            />
          </div>
          <div className="rounded-lg border border-dashed border-border/60 p-4 min-h-[120px] hover:border-primary/30 transition-colors">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Right column</p>
            <InlineTextEditor
              key={`${block.id}-right`}
              content={block.contentRight || ""}
              onChange={(html) => onUpdate({ contentRight: html })}
              alignment={block.alignment}
              placeholder="Click to start writing..."
            />
          </div>
        </div>
      ) : (
        <InlineTextEditor
          content={block.content}
          onChange={(html) => onUpdate({ content: html })}
          alignment={block.alignment}
          placeholder="Click to start writing..."
        />
      )}
      {block.ctaEnabled && (
        <div className={cn("mt-6", block.alignment === "center" ? "text-center" : block.alignment === "right" ? "text-right" : "")}>
          <a
            href={block.ctaHref || "#"}
            className={cn(
              "inline-block px-6 py-2.5 text-sm font-medium rounded-lg transition-colors",
              block.ctaStyle === "outline"
                ? "border border-[var(--page-accent)] text-[var(--page-accent)]"
                : block.ctaStyle === "secondary"
                ? "bg-[var(--page-surface)] text-[var(--page-text)]"
                : "bg-[var(--page-accent)] text-white"
            )}
          >
            {block.ctaLabel || "Learn More"}
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Image Live Block with inline upload ─── */
function ImageLiveBlock({
  block,
  onUpdate,
  eventId,
}: {
  block: import("@/types/event-pages").ImageBlock;
  onUpdate: (updates: Partial<import("@/types/event-pages").ImageBlock>) => void;
  eventId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
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
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleUpload(file);
  }

  if (block.url) {
    return (
      <figure className="relative group/img">
        <SafeImage src={block.url} alt={block.alt} className="w-full rounded-xl object-cover" width={800} height={400} />
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
          <div className="opacity-0 group-hover/img:opacity-100 transition-opacity flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="bg-white/90 text-zinc-800 rounded-lg px-3 py-1.5 text-xs font-medium shadow hover:bg-white"
            >
              Replace
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate({ url: "", alt: "" }); }}
              className="bg-red-500/90 text-white rounded-lg px-3 py-1.5 text-xs font-medium shadow hover:bg-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {block.caption && (
          <figcaption className="mt-2 text-center text-sm" style={{ color: "var(--page-text-secondary)" }}>
            {block.caption}
          </figcaption>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }} />
      </figure>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
      className={cn(
        "rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30"
      )}
    >
      {uploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <>
          <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Click or drag an image here</p>
          <p className="text-xs text-muted-foreground/60 mt-1">JPEG, PNG, WebP, GIF — max 5MB</p>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
      }} />
    </div>
  );
}

/* ─── Gallery Live Block with inline upload ─── */
function GalleryLiveBlock({
  block,
  onUpdate,
  eventId,
}: {
  block: import("@/types/event-pages").GalleryBlock;
  onUpdate: (updates: Partial<import("@/types/event-pages").GalleryBlock>) => void;
  eventId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
        onUpdate({ images: [...block.images, { url: data.url, alt: file.name.replace(/\.[^.]+$/, "") }] });
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleUpload(file);
  }

  const cols = block.columns || 3;

  return (
    <div className="space-y-3">
      {block.images.length > 0 && (
        <div className={cn(
          "grid gap-3",
          cols === 2 && "grid-cols-2",
          cols === 4 && "grid-cols-2 sm:grid-cols-4",
          cols === 3 && "grid-cols-2 sm:grid-cols-3"
        )}>
          {block.images.map((img, i) => (
            <figure key={i} className="relative group/img overflow-hidden rounded-xl">
              <SafeImage src={img.url} alt={img.alt} className="w-full aspect-[4/3] object-cover" width={800} height={400} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ images: block.images.filter((_, idx) => idx !== i) });
                }}
                className="absolute top-1.5 right-1.5 bg-red-500/90 text-white rounded-lg p-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity shadow"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </figure>
          ))}
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center cursor-pointer transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30"
        )}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Plus className="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              {block.images.length === 0 ? "Click or drag images here" : "Add more images"}
            </p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }} />
      </div>
    </div>
  );
}
