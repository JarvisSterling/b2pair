-- QR tokens: one per participant per event, used for check-in
create table if not exists public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  unique(event_id, participant_id)
);

-- RLS on qr_tokens
alter table public.qr_tokens enable row level security;

-- Participants can read their own token
create policy "Participants can view their own QR token"
  on public.qr_tokens for select
  to authenticated
  using (
    participant_id in (
      select id from public.participants where user_id = auth.uid()
    )
  );

-- Participants can insert their own token
create policy "Participants can create their own QR token"
  on public.qr_tokens for insert
  to authenticated
  with check (
    participant_id in (
      select id from public.participants where user_id = auth.uid()
    )
  );

-- Organizers can read all QR tokens for their events
create policy "Organizers can view QR tokens for their events"
  on public.qr_tokens for select
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid()
    )
  );

-- Check-ins: records when a participant was checked in
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  checked_in_by uuid references auth.users(id),
  method text not null default 'qr' check (method in ('qr', 'manual', 'self')),
  session_id uuid,  -- optional: for session-specific check-ins (agenda sessions)
  notes text,
  checked_in_at timestamptz not null default now()
);

-- RLS on check_ins
alter table public.check_ins enable row level security;

-- Participants can see their own check-ins
create policy "Participants can view their own check-ins"
  on public.check_ins for select
  to authenticated
  using (
    participant_id in (
      select id from public.participants where user_id = auth.uid()
    )
  );

-- Organizers can view all check-ins for their events
create policy "Organizers can view check-ins for their events"
  on public.check_ins for select
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid()
    )
  );

-- Organizers can insert check-ins for their events
create policy "Organizers can check in participants"
  on public.check_ins for insert
  to authenticated
  with check (
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid()
    )
  );

-- Organizers can delete check-ins (undo)
create policy "Organizers can delete check-ins"
  on public.check_ins for delete
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid()
    )
  );

-- Indexes for performance
create index if not exists idx_qr_tokens_event_participant on public.qr_tokens(event_id, participant_id);
create index if not exists idx_check_ins_event on public.check_ins(event_id);
create index if not exists idx_check_ins_participant on public.check_ins(participant_id);
create index if not exists idx_check_ins_session on public.check_ins(session_id) where session_id is not null;
