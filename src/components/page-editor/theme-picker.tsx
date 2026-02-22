"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { THEMES, type ThemeKey } from "@/types/event-pages";
import { cn } from "@/lib/utils";

interface ThemePickerProps {
  currentTheme: ThemeKey;
  accentColor: string | null;
  onThemeChange: (theme: ThemeKey) => void;
  onAccentChange: (color: string | null) => void;
}

export function ThemePicker({
  currentTheme,
  accentColor,
  onThemeChange,
  onAccentChange,
}: ThemePickerProps) {
  const [customAccent, setCustomAccent] = useState(accentColor || "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-body font-semibold">Theme</h3>
      </div>

      <div className="grid gap-3">
        {THEMES.map((theme) => {
          const selected = currentTheme === theme.key;
          return (
            <button
              key={theme.key}
              onClick={() => onThemeChange(theme.key)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-all duration-150",
                selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              )}
            >
              {selected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              {/* Theme preview strip */}
              <div className="flex gap-1.5 mb-2">
                <div
                  className="h-6 w-6 rounded-md border border-black/5"
                  style={{ backgroundColor: theme.preview.bg }}
                />
                <div
                  className="h-6 w-6 rounded-md border border-black/5"
                  style={{ backgroundColor: theme.preview.surface }}
                />
                <div
                  className="h-6 w-6 rounded-md border border-black/5"
                  style={{ backgroundColor: theme.preview.accent }}
                />
                <div
                  className="h-6 w-6 rounded-md border border-black/5"
                  style={{ backgroundColor: theme.preview.text }}
                />
              </div>
              <p className="text-sm font-medium">{theme.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {theme.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Accent color override */}
      <div className="pt-2 border-t">
        <Label className="text-caption font-medium mb-2 block">
          Custom accent color
        </Label>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="color"
              value={customAccent || THEMES.find((t) => t.key === currentTheme)?.preview.accent || "#0071E3"}
              onChange={(e) => {
                setCustomAccent(e.target.value);
                onAccentChange(e.target.value);
              }}
              className="h-9 w-9 rounded-lg border border-border cursor-pointer"
            />
          </div>
          <Input
            value={customAccent}
            onChange={(e) => {
              setCustomAccent(e.target.value);
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                onAccentChange(e.target.value);
              }
            }}
            placeholder="#0071E3"
            className="h-9 text-sm font-mono flex-1"
          />
          {customAccent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setCustomAccent("");
                onAccentChange(null);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
