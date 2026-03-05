-- Enable pgvector if not already enabled
create extension if not exists vector;

-- Function to compute cosine similarities between all participant pairs in an event
-- Returns rows of (participant_a, participant_b, similarity) where a < b (lexicographic)
create or replace function public.get_embedding_similarities(p_event_id uuid)
returns table(participant_a uuid, participant_b uuid, similarity float)
language sql
security definer
set search_path = public
as $$
  select
    least(pe1.participant_id, pe2.participant_id) as participant_a,
    greatest(pe1.participant_id, pe2.participant_id) as participant_b,
    -- cosine similarity via pgvector (1 - cosine_distance)
    (1 - (pe1.embedding <=> pe2.embedding))::float as similarity
  from profile_embeddings pe1
  join profile_embeddings pe2
    on pe1.participant_id < pe2.participant_id
  join participants p1 on p1.id = pe1.participant_id
  join participants p2 on p2.id = pe2.participant_id
  where p1.event_id = p_event_id
    and p2.event_id = p_event_id
    and pe1.embedding is not null
    and pe2.embedding is not null;
$$;

-- Grant execute to service role
grant execute on function public.get_embedding_similarities(uuid) to service_role;
