"use client";

import { THEMES, type ThemeKey } from "@/types/event-pages";

interface ThemeProviderProps {
  themeKey: ThemeKey;
  accentColor?: string | null;
  children: React.ReactNode;
}

/**
 * Wraps event page content and injects theme CSS variables.
 * Used on public event pages to apply organizer-selected theme.
 */
export function EventThemeProvider({
  themeKey,
  accentColor,
  children,
}: ThemeProviderProps) {
  const theme = THEMES.find((t) => t.key === themeKey) || THEMES[0];
  const variables = { ...theme.variables };

  // Apply accent color override
  if (accentColor) {
    variables["--page-accent"] = accentColor;
  }

  const style = Object.entries(variables).reduce(
    (acc, [key, value]) => {
      acc[key as string] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  return (
    <div
      className="min-h-screen"
      style={{
        ...style,
        backgroundColor: variables["--page-bg"],
        color: variables["--page-text"],
        fontFamily: variables["--page-font-body"],
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
