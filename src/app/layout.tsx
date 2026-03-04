import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { SonnerToaster } from "@/components/sonner-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "B2Pair",
    template: "%s | B2Pair",
  },
  description:
    "AI-powered B2B event matchmaking. Connect the right people at your business events.",
  keywords: [
    "B2B matchmaking",
    "event networking",
    "AI matching",
    "business events",
    "meeting scheduling",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          {children}
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
