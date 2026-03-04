"use client";

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";

export interface BadgeConfig {
  size: "card" | "badge" | "large";
  background: string;
  accentColor: string;
  showAccentBar: boolean;
  accentPosition: "top" | "bottom";
  elements: BadgeElement[];
}

export interface BadgeElement {
  id: string;
  type: "full_name" | "company" | "title" | "role" | "qr" | "event_name";
  visible: boolean;
  x: number;    // 0–100 (% of badge width)
  y: number;    // 0–100 (% of badge height)
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  align: "left" | "center" | "right";
  width: number; // 0–100 (% of badge width)
  size?: number; // for QR element (px in canvas, pt in pdf)
}

export const BADGE_SIZES = {
  card:  { label: 'Card (3.5" × 2.5")',  canvasW: 350, canvasH: 250, pdfW: 252, pdfH: 180 },
  badge: { label: 'Badge (4" × 3")',      canvasW: 400, canvasH: 300, pdfW: 288, pdfH: 216 },
  large: { label: 'Large (4" × 6")',      canvasW: 300, canvasH: 450, pdfW: 288, pdfH: 432 },
} as const;

export const DEFAULT_BADGE_CONFIG: BadgeConfig = {
  size: "badge",
  background: "#ffffff",
  accentColor: "#6366f1",
  showAccentBar: true,
  accentPosition: "top",
  elements: [
    { id: "full_name",   type: "full_name",   visible: true,  x: 50, y: 28, fontSize: 20, fontWeight: "bold",   color: "#111111", align: "center", width: 88 },
    { id: "company",     type: "company",     visible: true,  x: 50, y: 44, fontSize: 13, fontWeight: "normal", color: "#555555", align: "center", width: 88 },
    { id: "title",       type: "title",       visible: true,  x: 50, y: 56, fontSize: 11, fontWeight: "normal", color: "#888888", align: "center", width: 88 },
    { id: "qr",          type: "qr",          visible: true,  x: 50, y: 75, fontSize: 0,  fontWeight: "normal", color: "#000000", align: "center", width: 22, size: 60 },
    { id: "event_name",  type: "event_name",  visible: true,  x: 50, y: 93, fontSize: 9,  fontWeight: "normal", color: "#aaaaaa", align: "center", width: 88 },
  ],
};

export interface Participant {
  id: string;
  full_name: string;
  company_name?: string;
  title?: string;
  role?: string;
  qr_token?: string;
}

function getQrUrl(token: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}&format=png&bgcolor=ffffff&color=000000&margin=4`;
}

function getField(participant: Participant, el: BadgeElement, eventName: string): string {
  switch (el.type) {
    case "full_name":  return participant.full_name || "";
    case "company":    return participant.company_name || "";
    case "title":      return participant.title || "";
    case "role":       return participant.role || "";
    case "event_name": return eventName;
    default:           return "";
  }
}

export function BadgePDFDocument({
  config,
  participants,
  eventName,
  eventLogo,
}: {
  config: BadgeConfig;
  participants: Participant[];
  eventName: string;
  eventLogo?: string | null;
}) {
  const sz = BADGE_SIZES[config.size];
  const W = sz.pdfW;
  const H = sz.pdfH;
  const ACCENT_H = H * 0.1;

  const styles = StyleSheet.create({
    page: { backgroundColor: "#f0f0f0", flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
    badge: { width: W, height: H, backgroundColor: config.background, position: "relative", overflow: "hidden" },
    accentTop:    { position: "absolute", top: 0,          left: 0, width: W, height: ACCENT_H, backgroundColor: config.accentColor },
    accentBottom: { position: "absolute", bottom: 0,       left: 0, width: W, height: ACCENT_H, backgroundColor: config.accentColor },
  });

  return (
    <Document title={`${eventName} - Badges`}>
      {participants.map((p) => (
        <Page key={p.id} size={[W + 24, H + 24]} style={styles.page}>
          <View style={styles.badge}>
            {/* Accent bar */}
            {config.showAccentBar && config.accentPosition === "top"    && <View style={styles.accentTop} />}
            {config.showAccentBar && config.accentPosition === "bottom" && <View style={styles.accentBottom} />}

            {/* Elements */}
            {config.elements.filter((el) => el.visible).map((el) => {
              const elW = (el.width / 100) * W;
              const left = (el.x / 100) * W - elW / 2;
              const top  = (el.y / 100) * H;

              if (el.type === "qr") {
                const qrSize = el.size ?? 50;
                const qrToken = p.qr_token || p.id;
                return (
                  <View key={el.id} style={{ position: "absolute", left: left + (elW - qrSize) / 2, top: top - qrSize / 2 }}>
                    <Image src={getQrUrl(qrToken, qrSize * 3)} style={{ width: qrSize, height: qrSize }} />
                  </View>
                );
              }

              const text = getField(p, el, eventName);
              if (!text) return null;

              return (
                <View key={el.id} style={{ position: "absolute", left, top: top - (el.fontSize * 0.7), width: elW }}>
                  <Text
                    style={{
                      fontSize: el.fontSize,
                      fontWeight: el.fontWeight === "bold" ? "bold" : "normal",
                      color: el.color,
                      textAlign: el.align,
                    }}
                  >
                    {text}
                  </Text>
                </View>
              );
            })}
          </View>
        </Page>
      ))}
    </Document>
  );
}
