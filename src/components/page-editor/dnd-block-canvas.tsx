"use client";

import { useCallback } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContentBlock, BlockType } from "@/types/event-pages";
import { cn } from "@/lib/utils";

const BLOCK_LABELS: Record<BlockType, { label: string; icon: React.ReactNode }> = {
  hero: { label: "Hero", icon: <Layout className="h-3.5 w-3.5" /> },
  "rich-text": { label: "Text", icon: <Type className="h-3.5 w-3.5" /> },
  image: { label: "Image", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  gallery: { label: "Gallery", icon: <Grid3X3 className="h-3.5 w-3.5" /> },
  video: { label: "Video", icon: <Video className="h-3.5 w-3.5" /> },
  stats: { label: "Stats", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  faq: { label: "FAQ", icon: <HelpCircle className="h-3.5 w-3.5" /> },
  cta: { label: "Button", icon: <MousePointerClick className="h-3.5 w-3.5" /> },
  divider: { label: "Divider", icon: <Minus className="h-3.5 w-3.5" /> },
  sponsor: { label: "Sponsors", icon: <Award className="h-3.5 w-3.5" /> },
};

interface DndBlockCanvasProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onRemoveBlock: (id: string) => void;
  onAddBlock: (type: BlockType, index?: number) => void;
  eventId: string;
}

export function DndBlockCanvas({
  blocks,
  onChange,
  selectedBlockId,
  onSelectBlock,
  onRemoveBlock,
  onAddBlock,
  eventId,
}: DndBlockCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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

  if (blocks.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/40 p-16 text-center">
        <p className="text-muted-foreground mb-2">
          This page is empty
        </p>
        <p className="text-sm text-muted-foreground/60 mb-6">
          Click a block from the left panel to add content, or use the button below.
        </p>
        <InsertDropdown onAdd={(type) => onAddBlock(type)} />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {blocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              isSelected={block.id === selectedBlockId}
              onSelect={() => onSelectBlock(block.id)}
              onRemove={() => onRemoveBlock(block.id)}
              onInsertAfter={(type) => onAddBlock(type, index + 1)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableBlock({
  block,
  isSelected,
  onSelect,
  onRemove,
  onInsertAfter,
}: {
  block: ContentBlock;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onInsertAfter: (type: BlockType) => void;
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

  const meta = BLOCK_LABELS[block.type] || { label: block.type, icon: null };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        onClick={onSelect}
        className={cn(
          "relative rounded-xl border bg-background transition-all duration-150 cursor-pointer",
          isSelected
            ? "border-primary ring-2 ring-primary/20 shadow-sm"
            : "border-border/60 hover:border-primary/30",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        {/* Block toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {meta.icon}
            <span className="text-xs font-medium">{meta.label}</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Block preview */}
        <div className="px-4 py-3">
          <BlockPreview block={block} />
        </div>
      </div>

      {/* Insert point between blocks */}
      <div className="flex justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <InsertDropdown onAdd={onInsertAfter} compact />
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <div
          className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-6 text-center"
        >
          <p className="font-semibold text-lg">{block.title || "Hero Title"}</p>
          {block.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{block.subtitle}</p>
          )}
          {block.ctaLabel && (
            <span className="inline-block mt-3 px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg">
              {block.ctaLabel}
            </span>
          )}
        </div>
      );
    case "rich-text":
      return block.content ? (
        <div
          className="text-sm text-muted-foreground line-clamp-3 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      ) : (
        <p className="text-sm text-muted-foreground/50 italic">Empty text block</p>
      );
    case "image":
      return block.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.url}
          alt={block.alt}
          className="rounded-lg max-h-32 object-cover w-full"
        />
      ) : (
        <div className="h-20 rounded-lg border border-dashed border-border/40 flex items-center justify-center text-xs text-muted-foreground/50">
          No image uploaded
        </div>
      );
    case "gallery":
      return (
        <div className="flex gap-1.5">
          {block.images.length > 0
            ? block.images.slice(0, 4).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img.url}
                  alt={img.alt}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ))
            : <p className="text-xs text-muted-foreground/50 italic">No images</p>}
          {block.images.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">
              +{block.images.length - 4} more
            </span>
          )}
        </div>
      );
    case "video":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="h-4 w-4" />
          {block.url || "No video URL set"}
        </div>
      );
    case "stats":
      return (
        <div className="flex gap-6 justify-center text-center">
          {block.showParticipants && (
            <div>
              <p className="text-lg font-bold">--</p>
              <p className="text-xs text-muted-foreground">Participants</p>
            </div>
          )}
          {block.showMeetings && (
            <div>
              <p className="text-lg font-bold">--</p>
              <p className="text-xs text-muted-foreground">Meetings</p>
            </div>
          )}
          {block.showCountries && (
            <div>
              <p className="text-lg font-bold">--</p>
              <p className="text-xs text-muted-foreground">Countries</p>
            </div>
          )}
        </div>
      );
    case "faq":
      return (
        <div className="space-y-1">
          {block.items.slice(0, 3).map((item, i) => (
            <p key={i} className="text-sm text-muted-foreground truncate">
              Q: {item.question || "..."}
            </p>
          ))}
          {block.items.length > 3 && (
            <p className="text-xs text-muted-foreground/50">
              +{block.items.length - 3} more
            </p>
          )}
        </div>
      );
    case "cta":
      return (
        <div className="text-center">
          <span className="inline-block px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg">
            {block.label || "Button"}
          </span>
        </div>
      );
    case "sponsor":
      return (
        <p className="text-sm text-muted-foreground text-center">
          {block.title || "Sponsors"} — logos auto-populated
        </p>
      );
    case "divider":
      return <hr className="border-t border-border/60" />;
    default:
      return null;
  }
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
          className={cn(
            compact &&
              "h-5 w-5 p-0 rounded-full"
          )}
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
