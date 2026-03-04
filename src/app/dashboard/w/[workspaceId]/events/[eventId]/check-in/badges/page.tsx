"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Download, Save, RotateCcw, ChevronDown, ChevronUp,
  Check, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  type BadgeConfig, type BadgeElement, type Participant,
  BADGE_SIZES, DEFAULT_BADGE_CONFIG,
} from "@/components/badges/badge-pdf";

// ── helpers ──────────────────────────────────────────────────────────────────

function getFieldLabel(type: BadgeElement["type"]) {
  switch (type) {
    case "full_name":  return "Full Name";
    case "company":    return "Company";
    case "title":      return "Job Title";
    case "role":       return "Role";
    case "qr":         return "QR Code";
    case "event_name": return "Event Name";
  }
}

function getSampleValue(type: BadgeElement["type"], eventName: string) {
  switch (type) {
    case "full_name":  return "Alex Morgan";
    case "company":    return "TechCorp Inc.";
    case "title":      return "Head of Product";
    case "role":       return "Attendee";
    case "event_name": return eventName;
    default:           return "";
  }
}

function getQrPreviewUrl(size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size * 3}x${size * 3}&data=b2p_preview&format=png&bgcolor=ffffff&color=000000&margin=4`;
}

// ── Badge canvas (draggable preview) ─────────────────────────────────────────

function BadgeCanvas({
  config,
  selected,
  onSelect,
  onMove,
  eventName,
  previewParticipant,
}: {
  config: BadgeConfig;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  eventName: string;
  previewParticipant: Participant | null;
}) {
  const sz = BADGE_SIZES[config.size];
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);

  function getValue(el: BadgeElement) {
    if (previewParticipant) {
      switch (el.type) {
        case "full_name":  return previewParticipant.full_name || "Alex Morgan";
        case "company":    return previewParticipant.company_name || "";
        case "title":      return previewParticipant.title || "";
        case "role":       return previewParticipant.role || "";
        case "event_name": return eventName;
      }
    }
    return getSampleValue(el.type, eventName);
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string, elX: number, elY: number) => {
    e.stopPropagation();
    onSelect(id);
    dragging.current = { id, startX: e.clientX, startY: e.clientY, elX, elY };
  }, [onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !canvasRef.current) return;
    const { id, startX, startY, elX, elY } = dragging.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - startX) / rect.width) * 100;
    const dy = ((e.clientY - startY) / rect.height) * 100;
    const nx = Math.max(5, Math.min(95, elX + dx));
    const ny = Math.max(5, Math.min(95, elY + dy));
    onMove(id, nx, ny);
  }, [onMove]);

  const handleMouseUp = useCallback(() => { dragging.current = null; }, []);

  const ACCENT_H = sz.canvasH * 0.1;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={canvasRef}
        className="relative select-none shadow-2xl border border-border/40 overflow-hidden"
        style={{ width: sz.canvasW, height: sz.canvasH, backgroundColor: config.background, cursor: "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => onSelect(null)}
      >
        {/* Accent bar */}
        {config.showAccentBar && config.accentPosition === "top" && (
          <div className="absolute top-0 left-0 right-0" style={{ height: ACCENT_H, backgroundColor: config.accentColor }} />
        )}
        {config.showAccentBar && config.accentPosition === "bottom" && (
          <div className="absolute bottom-0 left-0 right-0" style={{ height: ACCENT_H, backgroundColor: config.accentColor }} />
        )}

        {/* Elements */}
        {config.elements.filter((el) => el.visible).map((el) => {
          const isSelected = selected === el.id;
          const elW = (el.width / 100) * sz.canvasW;
          const left = (el.x / 100) * sz.canvasW - elW / 2;
          const top = (el.y / 100) * sz.canvasH;

          if (el.type === "qr") {
            const qrSize = el.size ?? 60;
            return (
              <div
                key={el.id}
                className={`absolute cursor-move ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                style={{ left: left + (elW - qrSize) / 2, top: top - qrSize / 2, width: qrSize, height: qrSize }}
                onMouseDown={(e) => handleMouseDown(e, el.id, el.x, el.y)}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={getQrPreviewUrl(qrSize)} alt="QR" style={{ width: qrSize, height: qrSize }} />
              </div>
            );
          }

          const text = getValue(el);
          if (!text) return null;

          return (
            <div
              key={el.id}
              className={`absolute cursor-move ${isSelected ? "ring-1 ring-primary" : ""}`}
              style={{
                left,
                top: top - el.fontSize * 0.7,
                width: elW,
                fontSize: el.fontSize,
                fontWeight: el.fontWeight,
                color: el.color,
                textAlign: el.align,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.3,
                paddingTop: 2,
                paddingBottom: 2,
              }}
              onMouseDown={(e) => handleMouseDown(e, el.id, el.x, el.y)}
              onClick={(e) => e.stopPropagation()}
            >
              {text}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {sz.label} · drag elements to reposition
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BadgeDesignerPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [config, setConfig] = useState<BadgeConfig>(DEFAULT_BADGE_CONFIG);
  const [selected, setSelected] = useState<string | null>(null);
  const [eventName, setEventName] = useState("Your Event");
  const [eventLogo, setEventLogo] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedEl, setExpandedEl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load badge config + participants
  useEffect(() => {
    async function load() {
      const [configRes, partRes] = await Promise.all([
        fetch(`/api/events/${eventId}/badge-config`),
        fetch(`/api/events/${eventId}/badge-participants`),
      ]);
      const configData = await configRes.json();
      const partData = await partRes.json();

      if (configData.badgeConfig) setConfig(configData.badgeConfig);
      setEventName(configData.eventName || "Your Event");
      setEventLogo(configData.eventLogo || null);
      setParticipants(partData.participants || []);
      setLoaded(true);
    }
    load();
  }, [eventId]);

  const previewParticipant = participants[previewIndex] || null;

  // Update element position from canvas drag
  const handleMove = useCallback((id: string, x: number, y: number) => {
    setConfig((c) => ({
      ...c,
      elements: c.elements.map((el) => el.id === id ? { ...el, x, y } : el),
    }));
  }, []);

  function updateEl(id: string, patch: Partial<BadgeElement>) {
    setConfig((c) => ({
      ...c,
      elements: c.elements.map((el) => el.id === id ? { ...el, ...patch } : el),
    }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/events/${eventId}/badge-config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badgeConfig: config }),
    });
    setSaving(false);
    if (res.ok) toast.success("Badge design saved");
    else toast.error("Failed to save");
  }

  async function generatePDF() {
    if (participants.length === 0) {
      toast.error("No registered participants yet");
      return;
    }
    setGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { BadgePDFDocument } = await import("@/components/badges/badge-pdf");
      const blob = await pdf(
        <BadgePDFDocument
          config={config}
          participants={participants}
          eventName={eventName}
          eventLogo={eventLogo}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventName.replace(/\s+/g, "-")}-badges.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${participants.length} badge${participants.length !== 1 ? "s" : ""} exported`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  const selectedEl = config.elements.find((el) => el.id === selected) || null;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Badge Designer</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Design and print attendee badges for {eventName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setConfig(DEFAULT_BADGE_CONFIG); toast.success("Reset to defaults"); }}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save
          </Button>
          <Button size="sm" onClick={generatePDF} disabled={generating}>
            {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            Print All ({participants.length})
          </Button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left sidebar ───────────────────────────────────────────── */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Badge size */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-3">Badge Size</p>
            <div className="space-y-1.5">
              {(Object.keys(BADGE_SIZES) as (keyof typeof BADGE_SIZES)[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setConfig((c) => ({ ...c, size: key }))}
                  className={`w-full text-left px-3 py-2 rounded text-caption transition-colors ${
                    config.size === key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {BADGE_SIZES[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-3">Colors</p>
            <div className="space-y-3">
              <div>
                <label className="text-caption text-muted-foreground mb-1.5 block">Background</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.background} onChange={(e) => setConfig((c) => ({ ...c, background: e.target.value }))} className="h-8 w-8 rounded border cursor-pointer" />
                  <Input value={config.background} onChange={(e) => setConfig((c) => ({ ...c, background: e.target.value }))} className="flex-1 h-8 text-caption font-mono" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-caption text-muted-foreground">Accent bar</label>
                  <button onClick={() => setConfig((c) => ({ ...c, showAccentBar: !c.showAccentBar }))} className="text-[10px] text-primary">
                    {config.showAccentBar ? "Hide" : "Show"}
                  </button>
                </div>
                {config.showAccentBar && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.accentColor} onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))} className="h-8 w-8 rounded border cursor-pointer" />
                      <Input value={config.accentColor} onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))} className="flex-1 h-8 text-caption font-mono" />
                    </div>
                    <div className="flex gap-1.5">
                      {(["top", "bottom"] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setConfig((c) => ({ ...c, accentPosition: pos }))}
                          className={`flex-1 py-1 rounded text-[10px] font-medium capitalize transition-colors ${config.accentPosition === pos ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Elements */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-3">Elements</p>
            <div className="space-y-1">
              {config.elements.map((el) => (
                <div key={el.id} className={`rounded-lg border transition-colors ${selected === el.id ? "border-primary/50 bg-primary/5" : "border-transparent"}`}>
                  {/* Element header */}
                  <div
                    className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                    onClick={() => { setSelected(selected === el.id ? null : el.id); setExpandedEl(expandedEl === el.id ? null : el.id); }}
                  >
                    <button
                      className="shrink-0 p-0.5 rounded hover:bg-secondary"
                      onClick={(e) => { e.stopPropagation(); updateEl(el.id, { visible: !el.visible }); }}
                      title={el.visible ? "Hide" : "Show"}
                    >
                      {el.visible ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    </button>
                    <span className={`flex-1 text-caption ${el.visible ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {getFieldLabel(el.type)}
                    </span>
                    {expandedEl === el.id ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </div>

                  {/* Element controls */}
                  {expandedEl === el.id && el.type !== "qr" && (
                    <div className="px-2 pb-3 space-y-2">
                      {/* Font size */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground w-14 shrink-0">Size</label>
                        <input
                          type="range" min={8} max={36} value={el.fontSize}
                          onChange={(e) => updateEl(el.id, { fontSize: Number(e.target.value) })}
                          className="flex-1 h-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-6 text-right">{el.fontSize}</span>
                      </div>
                      {/* Width */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground w-14 shrink-0">Width</label>
                        <input
                          type="range" min={20} max={100} value={el.width}
                          onChange={(e) => updateEl(el.id, { width: Number(e.target.value) })}
                          className="flex-1 h-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-6 text-right">{el.width}%</span>
                      </div>
                      {/* Color */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground w-14 shrink-0">Color</label>
                        <input type="color" value={el.color} onChange={(e) => updateEl(el.id, { color: e.target.value })} className="h-6 w-8 rounded border cursor-pointer" />
                        <Input value={el.color} onChange={(e) => updateEl(el.id, { color: e.target.value })} className="flex-1 h-6 text-[10px] font-mono px-1.5" />
                      </div>
                      {/* Bold + Align */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground w-14 shrink-0">Style</label>
                        <button
                          onClick={() => updateEl(el.id, { fontWeight: el.fontWeight === "bold" ? "normal" : "bold" })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${el.fontWeight === "bold" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                        >B</button>
                        <div className="flex gap-0.5 ml-1">
                          {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Icon]) => (
                            <button key={a} onClick={() => updateEl(el.id, { align: a as any })}
                              className={`p-1 rounded transition-colors ${el.align === a ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                            >
                              <Icon className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR size control */}
                  {expandedEl === el.id && el.type === "qr" && (
                    <div className="px-2 pb-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground w-14 shrink-0">Size</label>
                        <input
                          type="range" min={30} max={100} value={el.size ?? 60}
                          onChange={(e) => updateEl(el.id, { size: Number(e.target.value) })}
                          className="flex-1 h-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-6 text-right">{el.size ?? 60}px</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center: Canvas + preview controls ────────────────────── */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Preview attendee selector */}
          <div className="flex items-center gap-3 text-caption">
            <span className="text-muted-foreground">Preview as:</span>
            <select
              value={previewIndex}
              onChange={(e) => setPreviewIndex(Number(e.target.value))}
              className="h-8 rounded bg-input px-2 text-caption border border-border"
            >
              <option value={-1}>Sample data</option>
              {participants.map((p, i) => (
                <option key={p.id} value={i}>{p.full_name || p.id}</option>
              ))}
            </select>
            <Badge variant="outline" className="text-[10px]">
              {participants.length} registered
            </Badge>
          </div>

          {/* Badge canvas */}
          <BadgeCanvas
            config={config}
            selected={selected}
            onSelect={setSelected}
            onMove={handleMove}
            eventName={eventName}
            previewParticipant={previewIndex >= 0 ? previewParticipant : null}
          />

          {/* Selected element hint */}
          {selected && (
            <p className="text-[10px] text-muted-foreground animate-fade-in">
              Drag to reposition · use controls on the left to style
            </p>
          )}
          {!selected && (
            <p className="text-[10px] text-muted-foreground">
              Click an element to select and style it
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
