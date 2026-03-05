"use client";

import { useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save, Loader2, Zap, Check, Sparkles, Brain, RotateCcw,
  ChevronRight, RefreshCw, Settings2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Recommended defaults ────────────────────────────────────────────────────
// Based on B2B matchmaking best practices:
//   • Intent is the strongest signal (why are you here?)
//   • Industry + complementarity roughly equal
//   • AI similarity catches non-obvious connections
//   • Interest is often sparse early, keep low
const RECOMMENDED_WEIGHTS = {
  intent_weight: 0.40,
  industry_weight: 0.20,
  interest_weight: 0.05,
  complementarity_weight: 0.20,
  embedding_weight: 0.15,
};

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

  const { data: matchingData, isLoading: loading, mutate } = useSWR(
    eventId ? `matching-rules-${eventId}` : null,
    async () => {
      const supabase = createClient();

      const [rulesRes, participantsRes] = await Promise.all([
        supabase.from("matching_rules").select("*").eq("event_id", eventId).single(),
        supabase
          .from("participants")
          .select("id, intent_vector, intent_confidence, ai_intent_classification")
          .eq("event_id", eventId)
          .eq("status", "approved"),
      ]);

      let rules = rulesRes.data as MatchingRules | null;
      if (!rules) {
        const { data: newRules } = await supabase
          .from("matching_rules")
          .insert({
            event_id: eventId,
            ...RECOMMENDED_WEIGHTS,
            minimum_score: 50,
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

      const pIds = (participantsRes.data || []).map((p: any) => p.id);
      const { count: embCount } = pIds.length > 0
        ? await supabase
            .from("profile_embeddings")
            .select("id", { count: "exact", head: true })
            .in("participant_id", pIds)
        : { count: 0 };

      const allP = participantsRes.data || [];
      const intentStats = {
        total: allP.length,
        withVector: allP.filter(
          (p: any) => p.intent_vector && Object.keys(p.intent_vector).length > 0 && p.intent_confidence > 0
        ).length,
        highConfidence: allP.filter((p: any) => p.intent_confidence >= 50).length,
        withAI: allP.filter(
          (p: any) => p.ai_intent_classification && Object.keys(p.ai_intent_classification).length > 0
        ).length,
      };

      // Check if matches exist
      const { count: matchCount } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);

      return { rules, embeddingCount: embCount || 0, intentStats, matchCount: matchCount || 0 };
    },
    { revalidateOnFocus: false }
  );

  const [rules, setRules] = useState<MatchingRules | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [embeddingCount, setEmbeddingCount] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [intentStats, setIntentStats] = useState<{
    total: number; withVector: number; highConfidence: number; withAI: number;
  } | null>(null);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const [computingIntents, setComputingIntents] = useState(false);
  const [classifyingAI, setClassifyingAI] = useState(false);
  const [generatingMatches, setGeneratingMatches] = useState(false);

  const [initialized, setInitialized] = useState(false);
  if (matchingData && !initialized) {
    setRules(matchingData.rules);
    setEmbeddingCount(matchingData.embeddingCount);
    setIntentStats(matchingData.intentStats);
    setMatchCount(matchingData.matchCount);
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
        { loading: "Saving...", success: "Rules saved", error: "Failed to save" }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleResetWeights() {
    if (!rules) return;
    setRules({ ...rules, ...RECOMMENDED_WEIGHTS });
    toast.success("Weights reset to recommended defaults");
  }

  async function handleGenerateEmbeddings() {
    setGeneratingEmbeddings(true);
    const toastId = toast.loading("Generating AI embeddings…");
    try {
      const res = await fetch("/api/embeddings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");
      toast.success(`${data.generated} embeddings generated`, { id: toastId });
      setEmbeddingCount(data.generated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: toastId });
    } finally {
      setGeneratingEmbeddings(false);
    }
  }

  async function handleClassifyAI() {
    setClassifyingAI(true);
    const toastId = toast.loading("Classifying intents with AI…");
    try {
      const res = await fetch("/api/intent/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");
      toast.success(`Classified ${data.classified} participants`, { id: toastId });
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: toastId });
    } finally {
      setClassifyingAI(false);
    }
  }

  async function handleComputeIntents() {
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
          if (!res.ok || !data.success) throw new Error(data.error || "Failed");
        })(),
        { loading: "Recomputing intent vectors…", success: "Intent vectors updated", error: (e) => e.message }
      );
      mutate();
    } finally {
      setComputingIntents(false);
    }
  }

  async function handleGenerateMatches() {
    setGeneratingMatches(true);
    const toastId = toast.loading("Generating matches — this may take a moment…");
    try {
      const res = await fetch("/api/matching/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");
      toast.success(
        `${data.matchCount} matches generated for ${data.participantCount} participants`,
        { id: toastId }
      );
      setMatchCount(data.matchCount);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: toastId });
    } finally {
      setGeneratingMatches(false);
    }
  }

  if (loading || !rules) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalWeight =
    rules.intent_weight +
    rules.industry_weight +
    rules.interest_weight +
    rules.complementarity_weight +
    rules.embedding_weight;

  const isRecommended =
    Math.abs(rules.intent_weight - RECOMMENDED_WEIGHTS.intent_weight) < 0.01 &&
    Math.abs(rules.industry_weight - RECOMMENDED_WEIGHTS.industry_weight) < 0.01 &&
    Math.abs(rules.interest_weight - RECOMMENDED_WEIGHTS.interest_weight) < 0.01 &&
    Math.abs(rules.complementarity_weight - RECOMMENDED_WEIGHTS.complementarity_weight) < 0.01 &&
    Math.abs(rules.embedding_weight - RECOMMENDED_WEIGHTS.embedding_weight) < 0.01;

  // Setup steps status
  const steps = [
    {
      id: "weights",
      label: "Configure matching weights",
      sublabel: "Set how each factor influences scores",
      done: true, // Always considered done (has defaults)
    },
    {
      id: "classify",
      label: "Classify intents with AI",
      sublabel: `${intentStats?.withAI ?? 0} of ${intentStats?.total ?? 0} participants classified`,
      done: (intentStats?.withAI ?? 0) > 0,
    },
    {
      id: "embeddings",
      label: "Generate AI embeddings",
      sublabel:
        (embeddingCount ?? 0) > 0
          ? `${embeddingCount} embeddings generated`
          : "Not generated yet",
      done: (embeddingCount ?? 0) > 0,
    },
    {
      id: "matches",
      label: "Generate matches",
      sublabel: (matchCount ?? 0) > 0 ? `${matchCount} matches generated` : "Not run yet",
      done: (matchCount ?? 0) > 0,
    },
  ];

  const allSetupDone = steps.every((s) => s.done);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Matching engine</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Configure scoring, run AI analysis, and generate matches for your participants.
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

      {/* Setup checklist */}
      <Card className={`mb-6 ${allSetupDone ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {allSetupDone ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
            {allSetupDone ? "Matching engine ready" : "Complete setup before opening event"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={step.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${
                    step.done
                      ? "bg-success/20 border-success/40 text-success"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {step.done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <div>
                  <p className={`text-body font-medium leading-tight ${step.done ? "line-through text-muted-foreground" : ""}`}>
                    {step.label}
                  </p>
                  <p className="text-caption text-muted-foreground">{step.sublabel}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Matching weights */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Matching weights</CardTitle>
            {!isRecommended && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetWeights}
                className="text-caption gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Recommended
              </Button>
            )}
            {isRecommended && (
              <span className="flex items-center gap-1 text-caption text-success">
                <Check className="h-3.5 w-3.5" /> Using recommended
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-caption text-muted-foreground -mt-2">
            Adjust how much each factor contributes to the match score. Weights are automatically normalized.
          </p>

          <WeightSlider
            label="Intent alignment"
            description="Are participants here for complementary reasons? (buyer/seller, investor/startup)"
            value={rules.intent_weight}
            recommended={RECOMMENDED_WEIGHTS.intent_weight}
            onChange={(v) => setRules({ ...rules, intent_weight: v })}
          />
          <WeightSlider
            label="Industry overlap"
            description="Same or related industries — tiered scoring across 40+ industry pairs"
            value={rules.industry_weight}
            recommended={RECOMMENDED_WEIGHTS.industry_weight}
            onChange={(v) => setRules({ ...rules, industry_weight: v })}
          />
          <WeightSlider
            label="Interest match"
            description="Shared expertise areas and interests — most useful once participants have complete profiles"
            value={rules.interest_weight}
            recommended={RECOMMENDED_WEIGHTS.interest_weight}
            onChange={(v) => setRules({ ...rules, interest_weight: v })}
          />
          <WeightSlider
            label="Complementarity"
            description="Company size and stage fit — enterprise buyers + startups, SMB + SMB, etc."
            value={rules.complementarity_weight}
            recommended={RECOMMENDED_WEIGHTS.complementarity_weight}
            onChange={(v) => setRules({ ...rules, complementarity_weight: v })}
          />
          <WeightSlider
            label="AI profile similarity"
            description="Deep semantic matching from bio, expertise, and intent text — catches non-obvious connections"
            value={rules.embedding_weight}
            recommended={RECOMMENDED_WEIGHTS.embedding_weight}
            icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
            onChange={(v) => setRules({ ...rules, embedding_weight: v })}
          />

          <div className="flex items-center justify-between rounded-sm border border-border p-3 bg-muted/30">
            <p className="text-caption font-medium">Total weight</p>
            <p className={`text-body font-semibold ${Math.abs(totalWeight - 1) < 0.01 ? "text-success" : "text-warning"}`}>
              {(totalWeight * 100).toFixed(0)}%
              {Math.abs(totalWeight - 1) > 0.01 && (
                <span className="text-caption font-normal text-muted-foreground ml-2">(auto-normalized)</span>
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

      {/* Pre-event setup — one-time operations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Pre-event setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-caption text-muted-foreground -mt-2">
            Run these once when your participant list is mostly locked in — typically 24–48 hours before opening matches.
            Each step takes a minute or less.
          </p>

          {/* Step 1: Classify intents */}
          <SetupStep
            number={1}
            icon={<Brain className="h-4 w-4" />}
            title="Classify intents with AI"
            description="Uses GPT to read each participant's bio, title, and profile text and classify what they're actually looking for. Improves intent alignment scoring significantly."
            when="Run once before opening matches. Re-run mid-event only if many participants have been very active in chat."
            status={
              (intentStats?.withAI ?? 0) > 0
                ? `${intentStats?.withAI} of ${intentStats?.total} classified`
                : "Not run yet"
            }
            done={(intentStats?.withAI ?? 0) > 0}
            loading={classifyingAI}
            onRun={handleClassifyAI}
            buttonLabel={
              classifyingAI
                ? "Classifying…"
                : (intentStats?.withAI ?? 0) > 0
                ? "Re-classify"
                : "Classify intents"
            }
          />

          {/* Step 2: Generate embeddings */}
          <SetupStep
            number={2}
            icon={<Sparkles className="h-4 w-4" />}
            title="Generate AI embeddings"
            description="Converts each participant's full profile into a semantic vector using OpenAI. Powers the AI Similarity score — catches connections that rule-based matching misses."
            when="Run once, costs a small number of OpenAI tokens. Re-run only if a batch of new participants joined or profiles were significantly updated."
            status={
              (embeddingCount ?? 0) > 0
                ? `${embeddingCount} embeddings active`
                : "Not generated yet"
            }
            done={(embeddingCount ?? 0) > 0}
            loading={generatingEmbeddings}
            onRun={handleGenerateEmbeddings}
            buttonLabel={
              generatingEmbeddings
                ? "Generating…"
                : (embeddingCount ?? 0) > 0
                ? "Regenerate"
                : "Generate embeddings"
            }
          />

          {/* Step 3: Generate matches */}
          <SetupStep
            number={3}
            icon={<Zap className="h-4 w-4" />}
            title="Generate matches"
            description="Runs the full matching engine across all approved participants using your current weights and AI data. Participants see results immediately."
            when="Run after steps 1 and 2. Re-run any time you adjust weights or after significant participant profile changes."
            status={
              (matchCount ?? 0) > 0
                ? `${matchCount} matches generated`
                : "Not run yet"
            }
            done={(matchCount ?? 0) > 0}
            loading={generatingMatches}
            onRun={handleGenerateMatches}
            buttonLabel={generatingMatches ? "Generating…" : (matchCount ?? 0) > 0 ? "Regenerate matches" : "Generate matches"}
            primary
          />
        </CardContent>
      </Card>

      {/* During event — intent signals */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            During the event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-caption text-muted-foreground -mt-2">
            As participants interact — viewing profiles, requesting meetings, sending messages — their intent signals
            improve. Recomputing intent vectors refreshes these signals. Run this every few hours during the event.
          </p>

          {/* Intent quality stats */}
          {intentStats && (
            <div className="rounded-sm border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-body font-medium">Intent signal quality</p>
                <span
                  className={`text-[10px] font-medium px-2 py-px rounded-full border ${
                    (intentStats.highConfidence / Math.max(intentStats.total, 1)) >= 0.6
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : (intentStats.highConfidence / Math.max(intentStats.total, 1)) >= 0.3
                      ? "bg-amber-950 text-amber-400 border-amber-800"
                      : "bg-red-950 text-red-400 border-red-800"
                  }`}
                >
                  {intentStats.total === 0
                    ? "No data"
                    : `${Math.round((intentStats.highConfidence / intentStats.total) * 100)}% high confidence`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { value: intentStats.total, label: "Participants" },
                  { value: intentStats.withVector, label: "With vectors" },
                  { value: intentStats.highConfidence, label: "High confidence" },
                  { value: intentStats.withAI, label: "AI classified" },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-h3 font-bold">{value}</p>
                    <p className="text-small text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            disabled={computingIntents}
            onClick={handleComputeIntents}
          >
            {computingIntents ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {computingIntents ? "Recomputing…" : "Recompute intent vectors"}
          </Button>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">Confidence threshold</p>
                <p className="text-caption text-muted-foreground">
                  Minimum intent confidence needed to fully influence matching
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
              onChange={(e) =>
                setRules({ ...rules, intent_confidence_threshold: parseInt(e.target.value) })
              }
              className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer accent-primary"
            />
          </div>

          <ToggleRow
            label="Behavioral intent inference"
            description="Improve intent signals from participant activity — profile views, meeting requests, messages"
            checked={rules.use_behavioral_intent ?? true}
            onChange={(v) => setRules({ ...rules, use_behavioral_intent: v })}
          />
        </CardContent>
      </Card>

      {/* Exclusions & priority */}
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

// ─── Setup step component ─────────────────────────────────────────────────────
function SetupStep({
  number,
  icon,
  title,
  description,
  when,
  status,
  done,
  loading,
  onRun,
  buttonLabel,
  primary = false,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  when: string;
  status: string;
  done: boolean;
  loading: boolean;
  onRun: () => void;
  buttonLabel: string;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-md border p-4 space-y-3 ${done ? "border-success/30 bg-success/5" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${
            done
              ? "bg-success/20 border-success/40 text-success"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-body font-medium flex items-center gap-1.5">
              {icon}
              {title}
            </p>
            <span className={`text-caption shrink-0 ${done ? "text-success" : "text-muted-foreground"}`}>
              {status}
            </span>
          </div>
          <p className="text-caption text-muted-foreground mt-0.5">{description}</p>
          <p className="text-small text-muted-foreground/70 mt-1.5 flex items-center gap-1">
            <ChevronRight className="h-3 w-3 shrink-0" />
            {when}
          </p>
        </div>
      </div>
      <Button
        onClick={onRun}
        disabled={loading}
        variant={primary ? "default" : "outline"}
        size="sm"
        className="w-full"
      >
        {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : icon}
        <span className="ml-1.5">{buttonLabel}</span>
      </Button>
    </div>
  );
}

// ─── Weight slider ────────────────────────────────────────────────────────────
function WeightSlider({
  label,
  description,
  value,
  recommended,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  value: number;
  recommended: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}) {
  const isAtRecommended = Math.abs(value - recommended) < 0.01;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body font-medium flex items-center gap-1.5">
            {icon}
            {label}
          </p>
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
        <div className="text-right">
          <span className="text-body font-semibold tabular-nums">
            {(value * 100).toFixed(0)}%
          </span>
          {!isAtRecommended && (
            <p className="text-[10px] text-muted-foreground">rec. {(recommended * 100).toFixed(0)}%</p>
          )}
        </div>
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

// ─── Toggle row ───────────────────────────────────────────────────────────────
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
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
