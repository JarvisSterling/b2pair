"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** "icon" = icon-only button; "row" = full row with label (for sidebar footers) */
  variant?: "icon" | "row";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (variant === "row") {
    return (
      <button
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-body",
          "text-muted-foreground hover:bg-secondary hover:text-foreground transition-all",
          className
        )}
      >
        {isDark ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        {isDark ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md",
        "text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
        className
      )}
    >
      {isDark
        ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.5} />
        : <Moon className="h-[18px] w-[18px]" strokeWidth={1.5} />}
    </button>
  );
}
