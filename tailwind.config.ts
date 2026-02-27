import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["64px", { lineHeight: "1.06", letterSpacing: "-0.04em", fontWeight: "700" }],
        h1: ["48px", { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        h3: ["16px", { lineHeight: "1.5", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "1.6", letterSpacing: "-0.005em", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "400" }],
        small: ["12px", { lineHeight: "1.3", letterSpacing: "0", fontWeight: "500" }],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
        },
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        blue: "hsl(var(--blue))",
        purple: "hsl(var(--purple))",
        cyan: "hsl(var(--cyan))",
        pink: "hsl(var(--pink))",
        orange: "hsl(var(--orange))",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        DEFAULT: "0 2px 4px rgba(0,0,0,0.04)",
        md: "0 4px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)",
        lg: "0 8px 16px rgba(0,0,0,0.06)",
        elevated: "0 16px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        112: "28rem",
        128: "32rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms ease",
        "fade-out": "fade-out 200ms ease",
        "slide-up": "slide-up 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 300ms ease",
        "slide-right": "slide-right 300ms ease",
        "slide-in-right": "slide-in-right 300ms ease",
        "scale-in": "scale-in 400ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
