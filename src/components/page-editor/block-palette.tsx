"use client";

import {
  Type,
  Image as ImageIcon,
  Video,
  HelpCircle,
  MousePointerClick,
  Minus,
  Grid3X3,
  BarChart3,
  Sparkles,
  Award,
  Layout,
} from "lucide-react";
import type { BlockType } from "@/types/event-pages";
import { cn } from "@/lib/utils";

const BLOCK_ITEMS: {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    type: "hero",
    label: "Hero",
    icon: <Layout className="h-4 w-4" />,
    description: "Full-width banner with title",
  },
  {
    type: "rich-text",
    label: "Text",
    icon: <Type className="h-4 w-4" />,
    description: "Headings, paragraphs, lists",
  },
  {
    type: "image",
    label: "Image",
    icon: <ImageIcon className="h-4 w-4" />,
    description: "Single image with caption",
  },
  {
    type: "gallery",
    label: "Gallery",
    icon: <Grid3X3 className="h-4 w-4" />,
    description: "Multi-image grid",
  },
  {
    type: "video",
    label: "Video",
    icon: <Video className="h-4 w-4" />,
    description: "YouTube or Vimeo embed",
  },
  {
    type: "stats",
    label: "Stats",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Event statistics counter",
  },
  {
    type: "faq",
    label: "FAQ",
    icon: <HelpCircle className="h-4 w-4" />,
    description: "Accordion Q&A",
  },
  {
    type: "cta",
    label: "Button",
    icon: <MousePointerClick className="h-4 w-4" />,
    description: "Call-to-action button",
  },
  {
    type: "sponsor",
    label: "Sponsors",
    icon: <Award className="h-4 w-4" />,
    description: "Sponsor logo grid",
  },
  {
    type: "divider",
    label: "Divider",
    icon: <Minus className="h-4 w-4" />,
    description: "Visual separator",
  },
];

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {BLOCK_ITEMS.map((item) => (
        <button
          key={item.type}
          onClick={() => onAddBlock(item.type)}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/60",
            "hover:border-primary/30 hover:bg-primary/5 transition-all duration-150",
            "cursor-pointer text-center group"
          )}
        >
          <div className="text-muted-foreground group-hover:text-primary transition-colors">
            {item.icon}
          </div>
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
