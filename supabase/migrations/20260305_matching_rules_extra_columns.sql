-- Add missing columns to matching_rules that exist in code but not in DB schema
alter table public.matching_rules
  add column if not exists company_size_weight numeric(3,2) default 0.10,
  add column if not exists embedding_weight numeric(3,2) default 0.20,
  add column if not exists intent_confidence_threshold integer default 40,
  add column if not exists use_behavioral_intent boolean default true;

-- Update schema defaults to match new weight distribution (intent + industry + interest + complementarity + company_size = 1.0 when no embeddings)
-- Existing rows get the new columns with defaults automatically
