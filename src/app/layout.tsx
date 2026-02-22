import type { Metadata, Viewport } from "next";
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
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
