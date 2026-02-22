"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Check,
  Eye,
  FileEdit,
  Image,
} from "lucide-react";

interface Section {
  type: string;
  title: string;
  content: string;
}

const SECTION_TYPES = [
  { value: "description", label: "Description", placeholder: "Describe your event in detail..." },
  { value: "speakers", label: "Speakers", placeholder: "List your speakers and their topics..." },
  { value: "schedule", label: "Schedule", placeholder: "Day 1:\n09:00 - Registration\n10:00 - Opening keynote..." },
  { value: "faq", label: "FAQ", placeholder: "Q: How do I register?\nA: Click the Register button..." },
  { value: "sponsors", label: "Sponsors", placeholder: "Our sponsors and partners..." },
  { value: "venue", label: "Venue Info", placeholder: "Venue details, directions, parking..." },
  { value: "custom", label: "Custom", placeholder: "Your content here..." },
];

export default function PageEditorPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [sections, setSections] = useState<Section[]>([]);
  const [heroUrl, setHeroUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slug, setSlug] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadEvent() {
    const { data } = await supabase
      .from("events")
      .select("page_sections, page_hero_url, slug")
      .eq("id", eventId)
      .single();

    if (data) {
      setSections((data.page_sections as Section[]) || []);
      setHeroUrl(data.page_hero_url || "");
      setSlug(data.slug || "");
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    await supabase
      .from("events")
      .update({
        page_sections: sections,
        page_hero_url: heroUrl || null,
      })
      .eq("id", eventId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addSection(type: string) {
    const template = SECTION_TYPES.find((t) => t.value === type);
    setSections([...sections, {
      type,
      title: template?.label || "Section",
      content: "",
    }]);
  }

  function updateSection(index: number, updates: Partial<Section>) {
    setSections(sections.map((s, i) => i === index ? { ...s, ...updates } : s));
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  function moveSection(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSections(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h2 font-semibold tracking-tight">Page Editor</h1>
          <p className="text-caption text-muted-foreground">
            Customize your event's public registration page.
          </p>
        </div>
        <div className="flex gap-2">
          {slug && (
            <a href={`/events/${slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </a>
          )}
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <Check className="mr-2 h-4 w-4" /> : null}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Hero image */}
      <Card className="mb-6">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <Image className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-body font-semibold">Hero Image</h3>
          </div>
          <Input
            placeholder="Image URL (e.g. https://images.unsplash.com/...)"
            value={heroUrl}
            onChange={(e) => setHeroUrl(e.target.value)}
          />
          {heroUrl && (
            <div className="mt-3 rounded-lg overflow-hidden h-32 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroUrl} alt="Hero preview" className="w-full h-full object-cover" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4 mb-6">
        {sections.map((section, i) => {
          const template = SECTION_TYPES.find((t) => t.value === section.type);
          return (
            <Card key={i}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveSection(i, -1)}
                      disabled={i === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSection(i, 1)}
                      disabled={i === sections.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    >
                      ↓
                    </button>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{section.type}</Badge>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(i, { title: e.target.value })}
                    className="h-8 text-sm font-medium flex-1"
                    placeholder="Section title"
                  />
                  <button
                    onClick={() => removeSection(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(i, { content: e.target.value })}
                  placeholder={template?.placeholder || "Content..."}
                  rows={4}
                  className="flex w-full rounded bg-input px-4 py-3 text-sm border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-y"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add section */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <p className="text-caption font-medium mb-3">Add a section</p>
          <div className="flex flex-wrap gap-2">
            {SECTION_TYPES.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                size="sm"
                onClick={() => addSection(type.value)}
                className="text-xs"
              >
                <Plus className="mr-1.5 h-3 w-3" />
                {type.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
