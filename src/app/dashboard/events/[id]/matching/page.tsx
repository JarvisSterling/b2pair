"use client";

import { useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, Zap, Check, Sparkles, Brain } from "lucide-react";
import { toast } from "sonner";

interface MatchingRules {
  id: string;
  event_id: string;
  intent_weight: number;
  industry_weight: number;
  interest_weight: number;
  complementarity_weight: number;
  embedding_weight: number;
  minimum_score: number;
  max_recommendations: number;
  exclude_same_company: boolean;
  exclude_same_role: boolean;
  prioritize_sponsors: boolean;
  prioritize_vip: boolean;
  use_behavioral_intent: boolean;
  intent_confidence_threshold: number;
}

export default function MatchingRulesPage() {
  const eventId = useEventId();
  // SWR: load matching rules + stats with caching
  const { data: matchingData, isLoading: loading, mutate } = useSWR(
    eventId ? `matching-rules-${eventId}` : null,
    async () => {
      const supabase = createClient();

      const [rulesRes, participantsRes] = await Promise.all([
        supabase.from("matching_rules").select("*").eq("event_id", eventId).single(),
        supabase.from("participants").select("id, intent_vector, intent_confidence, ai_intent_classification").eq("event_id", eventId).eq("status", "approved"),
      ]);

      let rules = rulesRes.data as MatchingRules | null;

      // Create default rules if none exist
      if (!rules) {
        const { data: newRules } = await supabase
          .from("matching_rules")
          .insert({
            event_id: eventId,
            intent_weight: 0.35,
            industry_weight: 0.25,
            interest_weight: 0.25,
            complementarity_weight: 0.15,
            minimum_score: 0.3,
            max_recommendations: 20,
            exclude_same_company: true,
            exclude_same_role: false,
            prioritize_sponsors: false,
            prioritize_vip: false,
          })
          .select()
          .single();
        rules = newRules as MatchingRules | null;
      }

      // Embedding count
      const pIds = (participantsRes.data || []).map((p: any) => p.id);
      const { count: embCount } = pIds.length > 0
        ? await supabase.from("profile_embeddings").select("id", { count: "exact", head: true }).in("participant_id", pIds)
        : { count: 0 };

      // Intent stats
      const allP = participantsRes.data || [];
      const intentStats = {
        total: allP.length,
        withVector: allP.filter((p: any) => p.intent_vector && Object.keys(p.intent_vector).length > 0 && p.intent_confidence > 0).length,
        highConfidence: allP.filter((p: any) => p.intent_confidence >= 50).length,
        withAI: allP.filter((p: any) => p.ai_intent_classification && Object.keys(p.ai_intent_classification).length > 0).length,
      };

      return { rules, embeddingCount: embCount || 0, intentStats };
    },
    { revalidateOnFocus: false }
  );

  const [rules, setRules] = useState<MatchingRules | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const [embeddingCount, setEmbeddingCount] = useState<number | null>(null);
  const [embeddingResult, setEmbeddingResult] = useState<string | null>(null);
  const [intentStats, setIntentStats] = useState<{ total: number; withVector: number; highConfidence: number; withAI: number } | null>(null);
  const [computingIntents, setComputingIntents] = useState(false);
  const [classifyingAI, setClassifyingAI] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Sync SWR data into local state for form editing
  const [initialized, setInitialized] = useState(false);
  if (matchingData && !initialized) {
    setRules(matchingData.rules);
    setEmbeddingCount(matchingData.embeddingCount);
    setIntentStats(matchingData.intentStats);
    setInitialized(true);
  }

  async function handleSave() {
    if (!rules) return;
    setSaving(true);

    const supabase = createClient();
    try {
      await toast.promise(
        (async () => {
          const { error } = await supabase
            .from("matching_rules")
            .update({
              intent_weight: rules.intent_weight,
              industry_weight: rules.industry_weight,
              interest_weight: rules.interest_weight,
              complementarity_weight: rules.complementarity_weight,
              embedding_weight: rules.embedding_weight,
              minimum_score: rules.minimum_score,
              max_recommendations: rules.max_recommendations,
              exclude_same_company: rules.exclude_same_company,
              exclude_same_role: rules.exclude_same_role,
              prioritize_sponsors: rules.prioritize_sponsors,
              prioritize_vip: rules.prioritize_vip,
              use_behavioral_intent: rules.use_behavioral_intent,
              intent_confidence_threshold: rules.intent_confidence_threshold,
            })
            .eq("id", rules.id);
          if (error) throw error;
        })(),
        {
          loading: "Saving...",
          success: "Rules updated",
          error: "Failed to save",
        }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !rules) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalWeight = rules.intent_weight + rules.industry_weight + rules.interest_weight + rules.complementarity_weight + rules.embedding_weight;

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Matching rules</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Configure how the AI matching algorithm scores participants.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {saved && (
            <span className="flex items-center gap-1 text-caption text-success animate-fade-in">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save rules
          </Button>
        </div>
      </div>

      {/* Weights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Matching weights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-caption text-muted-foreground">
            Adjust how much each factor contributes to the match score. Higher weight means more importance.
          </p>

          <WeightSlider
            label="Intent alignment"
            description="Buyer-seller, investor-startup, partner compatibility"
            value={rules.intent_weight}
            onChange={(v) => setRules({ ...rules, intent_weight: v })}
          />
          <WeightSlider
            label="Industry overlap"
            description="Same or complementary industries"
            value={rules.industry_weight}
            onChange={(v) => setRules({ ...rules, industry_weight: v })}
          />
          <WeightSlider
            label="Interest match"
            description="Shared expertise areas and interests"
            value={rules.interest_weight}
            onChange={(v) => setRules({ ...rules, interest_weight: v })}
          />
          <WeightSlider
            label="Complementarity"
            description="Company size, stage, and geographic fit"
            value={rules.complementarity_weight}
            onChange={(v) => setRules({ ...rules, complementarity_weight: v })}
          />
          <WeightSlider
            label="AI Profile Similarity"
            description="Deep semantic matching using AI embeddings"
            value={rules.embedding_weight}
            onChange={(v) => setRules({ ...rules, embedding_weight: v })}
            icon={<Brain className="h-4 w-4 text-primary" />}
          />

          <div className="flex items-center justify-between rounded-sm border border-border p-3">
            <p className="text-caption font-medium">Total weight</p>
            <p className={`text-body font-semibold ${Math.abs(totalWeight - 1) < 0.01 ? "text-success" : "text-warning"}`}>
              {totalWeight.toFixed(2)}
              {Math.abs(totalWeight - 1) > 0.01 && (
                <span className="text-caption font-normal text-muted-foreground ml-2">(will be normalized)</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-caption font-medium">Minimum match score (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={rules.minimum_score}
                onChange={(e) => setRules({ ...rules, minimum_score: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-small text-muted-foreground">Only show matches above this score</p>
            </div>
            <div className="space-y-2">
              <label className="text-caption font-medium">Max recommendations</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={rules.max_recommendations}
                onChange={(e) => setRules({ ...rules, max_recommendations: parseInt(e.target.value) || 50 })}
              />
              <p className="text-small text-muted-foreground">Per participant</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Embeddings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Profile Embeddings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-caption text-muted-foreground">
            Generate AI embeddings from participant profiles to enable deep semantic matching.
            This analyzes bios, expertise, interests, and intent to find non-obvious connections
            that rule-based matching might miss.
          </p>

          <div className="flex items-center justify-between rounded-sm border border-border p-4">
            <div>
              <p className="text-body font-medium">Embeddings status</p>
              <p className="text-caption text-muted-foreground">
                {embeddingCount === null
                  ? "Loading..."
                  : embeddingCount > 0
                  ? `${embeddingCount} participant embeddings generated`
                  : "No embeddings generated yet"}
              </p>
            </div>
            {embeddingCount !== null && embeddingCount > 0 && (
              <span className="flex items-center gap-1.5 text-caption text-success">
                <Check className="h-4 w-4" /> Active
              </span>
            )}
          </div>

          <Button
            onClick={async () => {
              setGeneratingEmbeddings(true);
              setEmbeddingResult(null);
              const toastId = toast.loading("Generating embeddings...");
              try {
                const res = await fetch("/api/embeddings/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ eventId }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate embeddings");
                toast.success("Embeddings generated", { id: toastId });
                if (data.success) {
                  setEmbeddingCount(data.generated);
                  setEmbeddingResult(`Generated ${data.generated} embeddings (${data.dimensions}D)`);
                }
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to generate", { id: toastId });
                setEmbeddingResult("Failed to generate embeddings");
              } finally {
                setGeneratingEmbeddings(false);
              }
            }}
            disabled={generatingEmbeddings}
            variant="outline"
            className="w-full"
          >
            {generatingEmbeddings ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {generatingEmbeddings
              ? "Generating embeddings..."
              : embeddingCount && embeddingCount > 0
              ? "Regenerate embeddings"
              : "Generate AI embeddings"}
          </Button>

          {embeddingResult && (
            <p className={`text-caption ${embeddingResult.startsWith("Error") ? "text-destructive" : "text-success"}`}>
              {embeddingResult}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Intent Intelligence */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Intent Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-caption text-muted-foreground">
            The intent engine infers what each participant is looking to do at the event.
            It combines their explicit selections with signals from their profile, title, and bio.
          </p>

          {/* Data quality indicator */}
          {intentStats && (
            <div className="rounded-sm border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-body font-medium">Intent data quality</p>
                <span className={`text-caption font-medium px-2 py-0.5 rounded-full ${
                  intentStats.highConfidence / Math.max(intentStats.total, 1) >= 0.6
                    ? "bg-emerald-500/10 text-emerald-600"
                    : intentStats.highConfidence / Math.max(intentStats.total, 1) >= 0.3
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-red-500/10 text-red-600"
                }`}>
                  {intentStats.total === 0 ? "No data" :
                    `${Math.round((intentStats.highConfidence / intentStats.total) * 100)}% high confidence`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-h3 font-bold">{intentStats.total}</p>
                  <p className="text-small text-muted-foreground">Participants</p>
                </div>
                <div>
                  <p className="text-h3 font-bold">{intentStats.withVector}</p>
                  <p className="text-small text-muted-foreground">With vectors</p>
                </div>
                <div>
                  <p className="text-h3 font-bold">{intentStats.highConfidence}</p>
                  <p className="text-small text-muted-foreground">High confidence</p>
                </div>
                <div>
                  <p className="text-h3 font-bold">{intentStats.withAI}</p>
                  <p className="text-small text-muted-foreground">AI classified</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={computingIntents}
                onClick={async () => {
                  setComputingIntents(true);
                  try {
                    await toast.promise(
                      (async () => {
                        const res = await fetch("/api/intent/compute", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ eventId }),
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || "Failed to compute intents");
                      })(),
                      {
                        loading: "Computing intents...",
                        success: "Intent vectors updated",
                        error: (error) => (error instanceof Error ? error.message : "Failed to compute intents"),
                      }
                    );
                    mutate();
                  } finally {
                    setComputingIntents(false);
                  }
                }}
              >
                {computingIntents ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-3.5 w-3.5" />
                )}
                {intentStats.withVector > 0 ? "Recompute intent vectors" : "Compute intent vectors"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={classifyingAI}
                onClick={async () => {
                  setClassifyingAI(true);
                  setAiResult(null);
                  const toastId = toast.loading("Classifying intents...");
                  try {
                    const res = await fetch("/api/intent/classify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ eventId }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.error || "Failed to classify");
                    toast.success("Intent classification complete", { id: toastId });
                    setAiResult(`Classified ${data.classified} of ${data.total} participants`);
                    mutate(); // Refresh stats
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to classify", { id: toastId });
                    setAiResult("Failed to classify");
                  } finally {
                    setClassifyingAI(false);
                  }
                }}
              >
                {classifyingAI ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-3.5 w-3.5" />
                )}
                {classifyingAI ? "Classifying with AI..." : "Classify intents with AI"}
              </Button>
              {aiResult && (
                <p className={`text-caption ${aiResult.startsWith("Error") ? "text-destructive" : "text-success"}`}>
                  {aiResult}
                </p>
              )}
            </div>
          )}

          <ToggleRow
            label="Behavioral intent inference"
            description="Learn participant intent from their activity, not just explicit selections"
            checked={rules.use_behavioral_intent}
            onChange={(v) => setRules({ ...rules, use_behavioral_intent: v })}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">Confidence threshold</p>
                <p className="text-caption text-muted-foreground">
                  Minimum intent confidence to fully influence matching
                </p>
              </div>
              <span className="text-body font-semibold tabular-nums w-12 text-right">
                {rules.intent_confidence_threshold}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={rules.intent_confidence_threshold}
              onChange={(e) => setRules({ ...rules, intent_confidence_threshold: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer accent-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Exclusions & Priority */}
      <Card>
        <CardHeader>
          <CardTitle>Exclusions & priority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Exclude same company"
            description="Don't match people from the same organization"
            checked={rules.exclude_same_company}
            onChange={(v) => setRules({ ...rules, exclude_same_company: v })}
          />
          <ToggleRow
            label="Exclude same role"
            description="Don't match people with the same event role"
            checked={rules.exclude_same_role}
            onChange={(v) => setRules({ ...rules, exclude_same_role: v })}
          />
          <ToggleRow
            label="Prioritize sponsors"
            description="Boost match visibility for sponsor participants"
            checked={rules.prioritize_sponsors}
            onChange={(v) => setRules({ ...rules, prioritize_sponsors: v })}
          />
          <ToggleRow
            label="Prioritize VIPs"
            description="Give VIP attendees higher recommendation priority"
            checked={rules.prioritize_vip}
            onChange={(v) => setRules({ ...rules, prioritize_vip: v })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function WeightSlider({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body font-medium flex items-center gap-1.5">{icon}{label}</p>
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
        <span className="text-body font-semibold tabular-nums w-12 text-right">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value * 100}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer accent-primary"
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-border p-4">
      <div>
        <p className="text-body font-medium">{label}</p>
        <p className="text-caption text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-border-strong"
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}
