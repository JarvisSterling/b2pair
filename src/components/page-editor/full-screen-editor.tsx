"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Check,
  Eye,
  Loader2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
  EyeOff,
  GripVertical,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DndBlockCanvas } from "@/components/page-editor/dnd-block-canvas";
import { BlockPalette } from "@/components/page-editor/block-palette";
import { BlockProperties } from "@/components/page-editor/block-properties";
import { ThemePicker } from "@/components/page-editor/theme-picker";
import { BannerEditor, type BannerLayout } from "@/components/page-editor/banner-editor";
import { BlockRenderer } from "@/components/events/block-renderer";
import { EventThemeProvider } from "@/components/events/theme-provider";
import type {
  EventPage,
  EventTheme,
  ContentBlock,
  ThemeKey,
  BlockType,
  PageType,
} from "@/types/event-pages";
import { DEFAULT_PAGES } from "@/types/event-pages";
import { cn } from "@/lib/utils";
import { randomId } from "@/lib/utils";

interface FullScreenEditorProps {
  event: any;
  initialPages: EventPage[];
  initialTheme: EventTheme | null;
  workspaceId: string;
}

export function FullScreenEditor({
  event,
  initialPages,
  initialTheme,
  workspaceId,
}: FullScreenEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [pages, setPages] = useState<EventPage[]>(initialPages);
  const [theme, setTheme] = useState<EventTheme | null>(initialTheme);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    initialPages[0]?.id || null
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  const [rightPanel, setRightPanel] = useState<"properties" | "theme">("properties");
  const [bannerUrl, setBannerUrl] = useState<string | null>(event.banner_url || null);
  const [bannerLayout, setBannerLayout] = useState<BannerLayout>(event.banner_layout || "split");
  const [logoUrl, setLogoUrl] = useState<string | null>(event.logo_url || null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) || null;
  const selectedBlock = selectedPage?.content.find(
    (b) => b.id === selectedBlockId
  ) || null;

  // Seed default pages if none exist
  useEffect(() => {
    async function seedPages() {
      if (pages.length > 0) return;
      const toInsert = DEFAULT_PAGES.map((p) => ({
        ...p,
        event_id: event.id,
      }));
      const { data: seeded } = await supabase
        .from("event_pages")
        .insert(toInsert)
        .select("*");
      if (seeded) {
        setPages(seeded as EventPage[]);
        setSelectedPageId(seeded[0]?.id || null);
      }
    }
    seedPages();
  }, []);

  // Seed default theme if none
  useEffect(() => {
    async function seedTheme() {
      if (theme) return;
      const { data: newTheme } = await supabase
        .from("event_themes")
        .upsert({ event_id: event.id, theme_key: "light-classic" })
        .select("*")
        .single();
      if (newTheme) setTheme(newTheme as EventTheme);
    }
    seedTheme();
  }, []);

  const updatePageContent = useCallback(
    (blocks: ContentBlock[]) => {
      if (!selectedPageId) return;
      setPages((prev) =>
        prev.map((p) =>
          p.id === selectedPageId ? { ...p, content: blocks } : p
        )
      );
    },
    [selectedPageId]
  );

  function updatePageField(field: keyof EventPage, value: unknown) {
    if (!selectedPageId) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedPageId ? { ...p, [field]: value } : p
      )
    );
  }

  function updateBlock(blockId: string, updates: Partial<ContentBlock>) {
    if (!selectedPage) return;
    const updatedBlocks = selectedPage.content.map((b) =>
      b.id === blockId ? ({ ...b, ...updates } as ContentBlock) : b
    );
    updatePageContent(updatedBlocks);
  }

  function addBlock(type: BlockType, index?: number) {
    if (!selectedPage) return;
    const id = randomId();
    let newBlock: ContentBlock;

    switch (type) {
      case "hero":
        newBlock = {
          id,
          type: "hero",
          title: event.name || "Your Event",
          subtitle: "Welcome to our event",
          ctaLabel: "Register Now",
          ctaHref: "",
          overlay: "dark",
          alignment: "center",
        };
        break;
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
      case "stats":
        newBlock = {
          id,
          type: "stats",
          title: "Event at a Glance",
          showParticipants: true,
          showMeetings: true,
          showCountries: true,
          showMessages: false,
        };
        break;
      case "faq":
        newBlock = {
          id,
          type: "faq",
          items: [{ question: "", answer: "" }],
        };
        break;
      case "cta":
        newBlock = {
          id,
          type: "cta",
          label: "Learn More",
          href: "",
          style: "primary",
        };
        break;
      case "divider":
        newBlock = { id, type: "divider" };
        break;
      case "sponsor":
        newBlock = { id, type: "sponsor", title: "Our Sponsors" };
        break;
      default:
        return;
    }

    const blocks = [...selectedPage.content];
    if (index !== undefined) {
      blocks.splice(index, 0, newBlock);
    } else {
      blocks.push(newBlock);
    }
    updatePageContent(blocks);
    setSelectedBlockId(id);
    setRightPanel("properties");
  }

  function removeBlock(blockId: string) {
    if (!selectedPage) return;
    updatePageContent(selectedPage.content.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }

  async function saveAll() {
    setSaving(true);
    try {
      // Save all pages
      for (const page of pages) {
        await supabase
          .from("event_pages")
          .update({
            content: page.content,
            title: page.title,
            is_visible: page.is_visible,
            sort_order: page.sort_order,
            seo_title: page.seo_title,
            seo_description: page.seo_description,
          })
          .eq("id", page.id);
      }

      // Save banner/logo
      await supabase
        .from("events")
        .update({ banner_url: bannerUrl, banner_layout: bannerLayout, logo_url: logoUrl })
        .eq("id", event.id);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function saveTheme(themeKey: ThemeKey, accentColor: string | null) {
    if (!theme) return;
    const updated = { ...theme, theme_key: themeKey, accent_color: accentColor };
    setTheme(updated);
    await supabase
      .from("event_themes")
      .update({ theme_key: themeKey, accent_color: accentColor })
      .eq("id", theme.id);
  }

  async function addPage() {
    const name = prompt("Page name:");
    if (!name) return;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const { data } = await supabase
      .from("event_pages")
      .insert({
        event_id: event.id,
        slug,
        title: name,
        page_type: "custom" as PageType,
        is_default: false,
        is_visible: true,
        sort_order: pages.length,
        content: [],
      })
      .select("*")
      .single();
    if (data) {
      const newPage = data as EventPage;
      setPages([...pages, newPage]);
      setSelectedPageId(newPage.id);
      setSelectedBlockId(null);
    }
  }

  async function deletePage(pageId: string) {
    const page = pages.find((p) => p.id === pageId);
    if (!page || page.is_default) return;
    if (!confirm(`Delete "${page.title}"?`)) return;
    await supabase.from("event_pages").delete().eq("id", pageId);
    const updated = pages.filter((p) => p.id !== pageId);
    setPages(updated);
    if (selectedPageId === pageId) {
      setSelectedPageId(updated[0]?.id || null);
      setSelectedBlockId(null);
    }
  }

  async function togglePageVisibility(pageId: string) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    setPages(
      pages.map((p) =>
        p.id === pageId ? { ...p, is_visible: !p.is_visible } : p
      )
    );
    await supabase
      .from("event_pages")
      .update({ is_visible: !page.is_visible })
      .eq("id", pageId);
  }

  const backUrl = `/dashboard/w/${workspaceId}/events/${event.id}`;

  // ─── Preview mode ───
  if (previewMode) {
    return (
      <div className="h-screen flex flex-col bg-muted/30">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewMode(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to editor
            </Button>
            <span className="text-sm text-muted-foreground">Preview</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant={previewMode === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto flex justify-center p-6">
          <div
            className={cn(
              "bg-background border rounded-2xl overflow-hidden shadow-lg w-full",
              previewMode === "mobile" && "max-w-[390px]"
            )}
          >
            <EventThemeProvider
              themeKey={(theme?.theme_key as ThemeKey) || "light-classic"}
              accentColor={theme?.accent_color}
            >
              {/* Tab nav */}
              <div
                className="flex gap-1 px-4 pt-4 pb-2 overflow-x-auto"
                style={{ borderBottom: "1px solid var(--page-border)" }}
              >
                {pages
                  .filter((p) => p.is_visible)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPageId(p.id);
                        setSelectedBlockId(null);
                      }}
                      className={cn(
                        "px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors",
                        p.id === selectedPageId
                          ? "font-medium"
                          : "opacity-60 hover:opacity-80"
                      )}
                      style={
                        p.id === selectedPageId
                          ? {
                              backgroundColor: "var(--page-surface)",
                              color: "var(--page-text)",
                            }
                          : { color: "var(--page-text-secondary)" }
                      }
                    >
                      {p.title}
                    </button>
                  ))}
              </div>
              <div className="px-6 py-8 max-w-3xl mx-auto">
                {selectedPage && (
                  <BlockRenderer
                    blocks={selectedPage.content as ContentBlock[]}
                  />
                )}
                {(!selectedPage || selectedPage.content.length === 0) && (
                  <p className="text-center text-sm opacity-40 py-12">
                    This page has no content yet.
                  </p>
                )}
              </div>
            </EventThemeProvider>
          </div>
        </div>
      </div>
    );
  }

  // ─── Editor mode ───
  return (
    <div className="h-screen flex flex-col bg-[#fafafa]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm font-medium truncate max-w-[200px]">
            {event.name}
          </span>
        </div>

        {/* Page tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[40%]">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => {
                setSelectedPageId(page.id);
                setSelectedBlockId(null);
              }}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                page.id === selectedPageId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {page.title}
              {!page.is_visible && (
                <EyeOff className="inline h-3 w-3 ml-1 opacity-50" />
              )}
            </button>
          ))}
          <button
            onClick={addPage}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreviewMode("desktop")}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Preview
          </Button>
          {event.slug && event.status !== "draft" && (
            <a
              href={`/events/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                View live
              </Button>
            </a>
          )}
          <Button onClick={saveAll} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-1.5 h-4 w-4" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* Main area: left panel + canvas + right panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Block palette + page settings */}
        <div className="w-[260px] border-r bg-background overflow-y-auto shrink-0">
          <div className="p-4 space-y-6">
            {/* Block palette */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Add Blocks
              </h3>
              <BlockPalette onAddBlock={(type) => addBlock(type)} />
            </div>

            {/* Page list */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pages
              </h3>
              <div className="space-y-1">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors group",
                      page.id === selectedPageId
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => {
                      setSelectedPageId(page.id);
                      setSelectedBlockId(null);
                    }}
                  >
                    <span className="flex-1 truncate">{page.title}</span>
                    {!page.is_visible && (
                      <EyeOff className="h-3 w-3 opacity-40" />
                    )}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePageVisibility(page.id);
                        }}
                        className="p-0.5 hover:text-foreground"
                        title={page.is_visible ? "Hide" : "Show"}
                      >
                        {page.is_visible ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                      {!page.is_default && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePage(page.id);
                          }}
                          className="p-0.5 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page settings for selected page */}
            {selectedPage && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Page Settings
                </h3>
                <Input
                  value={selectedPage.title}
                  onChange={(e) => updatePageField("title", e.target.value)}
                  placeholder="Page title"
                  className="h-8 text-sm"
                />
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    SEO
                  </p>
                  <Input
                    value={selectedPage.seo_title || ""}
                    onChange={(e) =>
                      updatePageField("seo_title", e.target.value || null)
                    }
                    placeholder="Meta title"
                    className="h-8 text-xs"
                  />
                  <textarea
                    value={selectedPage.seo_description || ""}
                    onChange={(e) =>
                      updatePageField(
                        "seo_description",
                        e.target.value || null
                      )
                    }
                    placeholder="Meta description"
                    rows={2}
                    className="flex w-full rounded-lg bg-input/50 px-3 py-2 text-xs border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-8 px-6">
            {/* Banner section - always visible on Home page */}
            {selectedPage?.page_type === "home" && (
              <BannerEditor
                eventName={event.name}
                startDate={event.start_date}
                endDate={event.end_date}
                bannerUrl={bannerUrl}
                bannerLayout={bannerLayout}
                onBannerUrlChange={setBannerUrl}
                onBannerLayoutChange={setBannerLayout}
                eventId={event.id}
              />
            )}
            {selectedPage ? (
              <DndBlockCanvas
                blocks={selectedPage.content}
                onChange={updatePageContent}
                selectedBlockId={selectedBlockId}
                onSelectBlock={(id) => {
                  setSelectedBlockId(id);
                  setRightPanel("properties");
                }}
                onRemoveBlock={removeBlock}
                onAddBlock={addBlock}
                eventId={event.id}
              />
            ) : (
              <div className="text-center text-sm text-muted-foreground py-20">
                Select a page to start editing
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Properties or Theme */}
        <div className="w-[280px] border-l bg-background overflow-y-auto shrink-0">
          <div className="flex border-b">
            <button
              onClick={() => setRightPanel("properties")}
              className={cn(
                "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
                rightPanel === "properties"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Properties
            </button>
            <button
              onClick={() => setRightPanel("theme")}
              className={cn(
                "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
                rightPanel === "theme"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Palette className="h-3.5 w-3.5 inline mr-1" />
              Theme
            </button>
          </div>
          <div className="p-4">
            {rightPanel === "theme" ? (
              <ThemePicker
                currentTheme={
                  (theme?.theme_key as ThemeKey) || "light-classic"
                }
                accentColor={theme?.accent_color || null}
                onThemeChange={(key) =>
                  saveTheme(key, theme?.accent_color || null)
                }
                onAccentChange={(color) =>
                  saveTheme(
                    (theme?.theme_key as ThemeKey) || "light-classic",
                    color
                  )
                }
              />
            ) : selectedBlock ? (
              <BlockProperties
                block={selectedBlock}
                onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
                onRemove={() => removeBlock(selectedBlock.id)}
                eventId={event.id}
              />
            ) : (
              <div className="text-center text-sm text-muted-foreground py-12">
                <p>Select a block to edit its properties</p>
                <p className="text-xs mt-2 opacity-60">
                  Click on any block in the canvas, or drag one from the left panel
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
