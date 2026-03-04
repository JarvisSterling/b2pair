"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSWRFetch } from "@/hooks/use-swr-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data, mutate } = useSWRFetch<{ workspace: Workspace }>(`/api/workspaces/${workspaceId}`);
  const workspace = data?.workspace;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (workspace && !initialized) {
    setName(workspace.name);
    setDescription(workspace.description || "");
    setInitialized(true);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Workspace name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      await mutate();
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!workspace) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={`/dashboard/w/${workspaceId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to workspace
          </Link>
          <h1 className="text-h1 font-semibold tracking-tight">Workspace settings</h1>
          <p className="mt-1 text-body text-muted-foreground">{workspace.name}</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* General */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <h3 className="text-label font-semibold mb-4">General</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ws-desc">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this workspace is for…"
              rows={3}
              className="mt-1.5 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Workspace info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-label font-semibold mb-4">Workspace info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Workspace ID</span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{workspaceId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>
              {new Date(workspace.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
