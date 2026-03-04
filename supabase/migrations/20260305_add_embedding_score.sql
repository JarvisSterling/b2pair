-- Add embedding_score column to matches table if it doesn't already exist
alter table public.matches
  add column if not exists embedding_score numeric(5,2) default 0;
