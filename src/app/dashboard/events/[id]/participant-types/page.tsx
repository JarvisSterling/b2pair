"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Check,
  Users,
} from "lucide-react";
import Link from "next/link";

interface ParticipantType {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: {
    can_book_meetings: boolean;
    can_message: boolean;
    can_view_directory: boolean;
    requires_approval: boolean;
  };
  max_participants: number | null;
  sort_order: number;
}

const DEFAULT_TYPES = [
  { name: "Buyer", description: "Looking to purchase products or services", color: "#3b82f6" },
  { name: "Seller", description: "Offering products or services", color: "#10b981" },
  { name: "Investor", description: "Looking for investment opportunities", color: "#8b5cf6" },
  { name: "Speaker", description: "Presenting at sessions or panels", color: "#f59e0b" },
  { name: "Sponsor", description: "Event sponsor with special visibility", color: "#ec4899" },
];

const COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function ParticipantTypesPage() {
  const eventId = useEventId();
  const router = useRouter();
  const [types, setTypes] = useState<ParticipantType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newType, setNewType] = useState({ name: "", description: "", color: "#6b7280" });
  const [showAdd, setShowAdd] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTypes() {
    const { data } = await supabase
      .from("event_participant_types")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order");

    setTypes((data as ParticipantType[]) || []);
    setLoading(false);
  }

  async function addType() {
    if (!newType.name.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("event_participant_types")
      .insert({
        event_id: eventId,
        name: newType.name.trim(),
        description: newType.description.trim() || null,
        color: newType.color,
        sort_order: types.length,
      })
      .select()
      .single();

    if (data && !error) {
      setTypes((prev) => [...prev, data as ParticipantType]);
      setNewType({ name: "", description: "", color: "#6b7280" });
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function removeType(id: string) {
    if (!confirm("Remove this participant type? Existing participants won't be affected.")) return;

    await supabase.from("event_participant_types").delete().eq("id", id);
    setTypes((prev) => prev.filter((t) => t.id !== id));
  }

  async function togglePermission(id: string, perm: keyof ParticipantType["permissions"]) {
    const type = types.find((t) => t.id === id);
    if (!type) return;

    const updated = { ...type.permissions, [perm]: !type.permissions[perm] };

    await supabase
      .from("event_participant_types")
      .update({ permissions: updated })
      .eq("id", id);

    setTypes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, permissions: updated } : t))
    );
  }

  async function addDefaults() {
    setSaving(true);
    const inserts = DEFAULT_TYPES.map((dt, i) => ({
      event_id: eventId,
      name: dt.name,
      description: dt.description,
      color: dt.color,
      sort_order: types.length + i,
    }));

    const { data } = await supabase
      .from("event_participant_types")
      .insert(inserts)
      .select();

    if (data) {
      setTypes((prev) => [...prev, ...(data as ParticipantType[])]);
    }
    setSaving(false);
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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-h2 font-semibold tracking-tight">Participant Types</h1>
          <p className="text-caption text-muted-foreground">
            Define the roles participants can choose when registering.
          </p>
        </div>
        {types.length === 0 && (
          <Button variant="outline" onClick={addDefaults} disabled={saving}>
            Add defaults
          </Button>
        )}
      </div>

      {/* Existing types */}
      <div className="space-y-3 mb-6">
        {types.length === 0 && !showAdd && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">No participant types defined.</p>
              <p className="mt-1 text-caption text-muted-foreground">
                Add types like Buyer, Seller, Speaker, etc. to let participants choose their role.
              </p>
            </CardContent>
          </Card>
        )}

        {types.map((type) => (
          <Card key={type.id}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div
                  className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: type.color }}
                >
                  {type.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body font-semibold">{type.name}</h3>
                    <Badge variant="outline" style={{ borderColor: type.color, color: type.color }}>
                      {type.name}
                    </Badge>
                  </div>
                  {type.description && (
                    <p className="text-caption text-muted-foreground mt-0.5">{type.description}</p>
                  )}

                  {/* Permissions */}
                  <div className="flex gap-2 mt-3">
                    {[
                      { key: "can_book_meetings" as const, label: "Meetings" },
                      { key: "can_message" as const, label: "Messages" },
                      { key: "can_view_directory" as const, label: "Directory" },
                      { key: "requires_approval" as const, label: "Needs Approval" },
                    ].map((perm) => (
                      <button
                        key={perm.key}
                        onClick={() => togglePermission(type.id, perm.key)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          type.permissions[perm.key]
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {type.permissions[perm.key] ? "✓" : "✗"} {perm.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => removeType(type.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add new type */}
      {showAdd ? (
        <Card>
          <CardContent className="pt-5 pb-5">
            <h3 className="text-body font-semibold mb-4">New participant type</h3>
            <div className="space-y-3">
              <Input
                placeholder="Type name (e.g. Buyer, Speaker)"
                value={newType.name}
                onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder="Description (optional)"
                value={newType.description}
                onChange={(e) => setNewType((p) => ({ ...p, description: e.target.value }))}
              />
              <div>
                <label className="text-caption font-medium mb-1.5 block">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewType((p) => ({ ...p, color: c }))}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        newType.color === c ? "ring-2 ring-ring ring-offset-2 scale-110" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={addType} disabled={!newType.name.trim() || saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Add type
                </Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add participant type
        </Button>
      )}
    </div>
  );
}
