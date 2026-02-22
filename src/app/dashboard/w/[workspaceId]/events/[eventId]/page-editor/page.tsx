"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Check,
  Eye,
  Plus,
  Trash2,
  EyeOff,
  GripVertical,
  Smartphone,
  Monitor,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { BlockEditor } from "@/components/page-editor/block-editor";
import { ThemePicker } from "@/components/page-editor/theme-picker";
import { BlockRenderer } from "@/components/events/block-renderer";
import { EventThemeProvider } from "@/components/events/theme-provider";
import type {
  EventPage,
  EventTheme,
  ContentBlock,
  ThemeKey,
  PageType,
} from "@/types/event-pages";
import { DEFAULT_PAGES } from "@/types/event-pages";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export default function PageEditorPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const supabase = createClient();

  const [pages, setPages] = useState<EventPage[]>([]);
  const [theme, setTheme] = useState<EventTheme | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  const [slug, setSlug] = useState("");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) || null;

  const loadData = useCallback(async () => {
    const [pagesRes, themeRes, eventRes] = await Promise.all([
      supabase
        .from("event_pages")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order"),
      supabase
        .from("event_themes")
        .select("*")
        .eq("event_id", eventId)
        .single(),
      supabase
        .from("events")
        .select("slug, banner_url, logo_url")
        .eq("id", eventId)
        .single(),
    ]);

    let loadedPages = (pagesRes.data || []) as EventPage[];

    // If no pages exist, seed defaults
    if (loadedPages.length === 0) {
      const toInsert = DEFAULT_PAGES.map((p) => ({ ...p, event_id: eventId }));
      const { data: seeded } = await supabase
        .from("event_pages")
        .insert(toInsert)
        .select("*");
      loadedPages = (seeded || []) as EventPage[];
    }

    setPages(loadedPages);
    if (loadedPages.length > 0 && !selectedPageId) {
      setSelectedPageId(loadedPages[0].id);
    }

    if (themeRes.data) {
      setTheme(themeRes.data as EventTheme);
    } else {
      // Create default theme
      const { data: newTheme } = await supabase
        .from("event_themes")
        .upsert({ event_id: eventId, theme_key: "light-classic" })
        .select("*")
        .single();
      if (newTheme) setTheme(newTheme as EventTheme);
    }

    if (eventRes.data) {
      setSlug(eventRes.data.slug || "");
      setBannerUrl(eventRes.data.banner_url || null);
      setLogoUrl(eventRes.data.logo_url || null);
    }

    setLoading(false);
  }, [eventId, selectedPageId, supabase]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePage() {
    if (!selectedPage) return;
    setSaving(true);

    await supabase
      .from("event_pages")
      .update({
        content: selectedPage.content,
        title: selectedPage.title,
        is_visible: selectedPage.is_visible,
        seo_title: selectedPage.seo_title,
        seo_description: selectedPage.seo_description,
      })
      .eq("id", selectedPage.id);

    // Save banner/logo to events table
    await supabase
      .from("events")
      .update({ banner_url: bannerUrl, logo_url: logoUrl })
      .eq("id", eventId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  function updatePageContent(blocks: ContentBlock[]) {
    if (!selectedPage) return;
    setPages(
      pages.map((p) =>
        p.id === selectedPage.id ? { ...p, content: blocks } : p
      )
    );
  }

  function updatePageField(field: keyof EventPage, value: unknown) {
    if (!selectedPage) return;
    setPages(
      pages.map((p) =>
        p.id === selectedPage.id ? { ...p, [field]: value } : p
      )
    );
  }

  async function addCustomPage() {
    const name = prompt("Page name:");
    if (!name) return;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data } = await supabase
      .from("event_pages")
      .insert({
        event_id: eventId,
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
    }
  }

  async function togglePageVisibility(pageId: string) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const newVisibility = !page.is_visible;

    setPages(pages.map((p) => (p.id === pageId ? { ...p, is_visible: newVisibility } : p)));
    await supabase
      .from("event_pages")
      .update({ is_visible: newVisibility })
      .eq("id", pageId);
  }

  async function handleImageUpload(file: File, type: "banner" | "logo") {
    const setUploading = type === "banner" ? setUploadingBanner : setUploadingLogo;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);
      fd.append("type", type);

      const res = await fetch("/api/events/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        if (type === "banner") setBannerUrl(data.url);
        else setLogoUrl(data.url);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Preview mode
  if (previewMode) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-4 px-4 pt-4">
          <div className="flex gap-2">
            <Button
              variant={previewMode === "desktop" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-4 w-4 mr-1.5" /> Desktop
            </Button>
            <Button
              variant={previewMode === "mobile" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-4 w-4 mr-1.5" /> Mobile
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(null)}>
            Back to editor
          </Button>
        </div>

        <div
          className={cn(
            "mx-auto border rounded-xl overflow-hidden shadow-lg",
            previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
          )}
        >
          <EventThemeProvider
            themeKey={theme?.theme_key as ThemeKey || "light-classic"}
            accentColor={theme?.accent_color}
          >
            {/* Tab navigation */}
            <div
              className="flex gap-1 px-4 pt-4 pb-2 overflow-x-auto"
              style={{ borderBottom: "1px solid var(--page-border)" }}
            >
              {pages
                .filter((p) => p.is_visible)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPageId(p.id)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors",
                      p.id === selectedPageId
                        ? "font-medium"
                        : "opacity-60 hover:opacity-80"
                    )}
                    style={
                      p.id === selectedPageId
                        ? { backgroundColor: "var(--page-surface)", color: "var(--page-text)" }
                        : { color: "var(--page-text-secondary)" }
                    }
                  >
                    {p.title}
                  </button>
                ))}
            </div>

            {/* Page content */}
            <div className="px-6 py-8 max-w-3xl mx-auto">
              {selectedPage && (
                <BlockRenderer blocks={selectedPage.content as ContentBlock[]} />
              )}
              {selectedPage?.content.length === 0 && (
                <p className="text-center text-sm opacity-40 py-12">
                  This page has no content yet.
                </p>
              )}
            </div>
          </EventThemeProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h2 font-semibold tracking-tight">Page Editor</h1>
          <p className="text-caption text-muted-foreground">
            Build and customize your event&apos;s public pages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode("desktop")}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          {slug && (
            <a href={`/events/${slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                View live
              </Button>
            </a>
          )}
          <Button onClick={savePage} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : null}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr_260px] gap-6">
        {/* Left sidebar: Pages */}
        <div className="space-y-4">
          <div>
            <h3 className="text-caption font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
              Pages
            </h3>
            <div className="space-y-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors",
                    page.id === selectedPageId
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="flex-1 truncate">{page.title}</span>
                  {!page.is_visible && (
                    <EyeOff className="h-3 w-3 opacity-40 shrink-0" />
                  )}
                  {page.is_default && (
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      Default
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={addCustomPage}
            >
              <Plus className="h-3 w-3 mr-1" /> Add page
            </Button>
          </div>

          {/* Page settings */}
          {selectedPage && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                Page settings
              </h3>
              <div className="space-y-2">
                <Input
                  value={selectedPage.title}
                  onChange={(e) => updatePageField("title", e.target.value)}
                  placeholder="Page title"
                  className="h-8 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => togglePageVisibility(selectedPage.id)}
                >
                  {selectedPage.is_visible ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" /> Hide page
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" /> Show page
                    </>
                  )}
                </Button>
                {!selectedPage.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-destructive hover:text-destructive"
                    onClick={() => deletePage(selectedPage.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete page
                  </Button>
                )}
              </div>

              {/* SEO */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  SEO
                </p>
                <Input
                  value={selectedPage.seo_title || ""}
                  onChange={(e) => updatePageField("seo_title", e.target.value || null)}
                  placeholder="Meta title"
                  className="h-8 text-xs"
                />
                <textarea
                  value={selectedPage.seo_description || ""}
                  onChange={(e) => updatePageField("seo_description", e.target.value || null)}
                  placeholder="Meta description"
                  rows={2}
                  className="flex w-full rounded-lg bg-input/50 px-3 py-2 text-xs border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Center: Block editor */}
        <div>
          {/* Banner & Logo (shown for Home page) */}
          {selectedPage?.page_type === "home" && (
            <div className="mb-6 space-y-3">
              {/* Banner */}
              <div>
                <p className="text-caption font-medium mb-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /> Hero banner
                </p>
                {bannerUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-muted h-36">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerUrl}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setBannerUrl(null)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1.5 hover:bg-black/80 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => bannerRef.current?.click()}
                    disabled={uploadingBanner}
                    className="w-full h-28 rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center hover:border-primary/30 transition-colors"
                  >
                    {uploadingBanner ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">
                          Upload banner (1600×500 recommended)
                        </span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={bannerRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "banner");
                  }}
                />
              </div>

              {/* Logo */}
              <div>
                <p className="text-caption font-medium mb-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /> Event logo
                </p>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => logoRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-1" />
                    )}
                    {logoUrl ? "Replace" : "Upload logo"}
                  </Button>
                  {logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive"
                      onClick={() => setLogoUrl(null)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "logo");
                  }}
                />
              </div>
            </div>
          )}

          {selectedPage ? (
            <BlockEditor
              blocks={selectedPage.content as ContentBlock[]}
              onChange={updatePageContent}
              eventId={eventId}
            />
          ) : (
            <div className="text-center text-sm text-muted-foreground py-20">
              Select a page to edit
            </div>
          )}
        </div>

        {/* Right sidebar: Theme */}
        <div>
          <ThemePicker
            currentTheme={(theme?.theme_key as ThemeKey) || "light-classic"}
            accentColor={theme?.accent_color || null}
            onThemeChange={(key) => saveTheme(key, theme?.accent_color || null)}
            onAccentChange={(color) =>
              saveTheme((theme?.theme_key as ThemeKey) || "light-classic", color)
            }
          />
        </div>
      </div>
    </div>
  );
}
