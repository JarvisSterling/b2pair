-- ============================================================
-- Agenda Tables Migration
-- Creates: speakers, rooms, agenda_tracks, agenda_sessions,
--          session_speakers, attendee_schedule
-- ============================================================

-- Speakers (event-scoped speakers)
create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  title text,
  company text,
  bio text,
  avatar_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists speakers_event_id_idx on public.speakers(event_id);

alter table public.speakers enable row level security;

create policy "Organizers can manage speakers"
  on public.speakers for all
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      where e.organization_id in (
        select organization_id from public.organization_members
        where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
      )
    )
  );

create policy "Participants can view speakers"
  on public.speakers for select
  to authenticated
  using (
    event_id in (
      select event_id from public.participants
      where user_id = auth.uid() and status = 'approved'
    )
  );

create policy "Public can view speakers for published events"
  on public.speakers for select
  using (
    event_id in (select id from public.events where status = 'published')
  );

-- ============================================================

-- Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  capacity int,
  location_note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rooms_event_id_idx on public.rooms(event_id);

alter table public.rooms enable row level security;

create policy "Organizers can manage rooms"
  on public.rooms for all
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      where e.organization_id in (
        select organization_id from public.organization_members
        where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
      )
    )
  );

create policy "Participants can view rooms"
  on public.rooms for select
  to authenticated
  using (
    event_id in (
      select event_id from public.participants
      where user_id = auth.uid() and status = 'approved'
    )
  );

create policy "Public can view rooms for published events"
  on public.rooms for select
  using (
    event_id in (select id from public.events where status = 'published')
  );

-- ============================================================

-- Agenda Tracks (colour-coded session tracks)
create table if not exists public.agenda_tracks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#0071E3',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists agenda_tracks_event_id_idx on public.agenda_tracks(event_id);

alter table public.agenda_tracks enable row level security;

create policy "Organizers can manage agenda_tracks"
  on public.agenda_tracks for all
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      where e.organization_id in (
        select organization_id from public.organization_members
        where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
      )
    )
  );

create policy "Participants can view agenda_tracks"
  on public.agenda_tracks for select
  to authenticated
  using (
    event_id in (
      select event_id from public.participants
      where user_id = auth.uid() and status = 'approved'
    )
  );

create policy "Public can view agenda_tracks for published events"
  on public.agenda_tracks for select
  using (
    event_id in (select id from public.events where status = 'published')
  );

-- ============================================================

-- Agenda Sessions
create table if not exists public.agenda_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id uuid references public.agenda_tracks(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  description text,
  session_type text not null default 'talk'
    check (session_type in ('talk', 'panel', 'workshop', 'break', 'networking', 'keynote')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_break boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists agenda_sessions_event_id_idx on public.agenda_sessions(event_id);
create index if not exists agenda_sessions_start_time_idx on public.agenda_sessions(start_time);

alter table public.agenda_sessions enable row level security;

create policy "Organizers can manage agenda_sessions"
  on public.agenda_sessions for all
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      where e.organization_id in (
        select organization_id from public.organization_members
        where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
      )
    )
  );

create policy "Participants can view agenda_sessions"
  on public.agenda_sessions for select
  to authenticated
  using (
    event_id in (
      select event_id from public.participants
      where user_id = auth.uid() and status = 'approved'
    )
  );

create policy "Public can view agenda_sessions for published events"
  on public.agenda_sessions for select
  using (
    event_id in (select id from public.events where status = 'published')
  );

-- ============================================================

-- Session Speakers (many-to-many junction)
create table if not exists public.session_speakers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agenda_sessions(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  role text,
  sort_order int not null default 0,
  unique (session_id, speaker_id)
);

create index if not exists session_speakers_session_id_idx on public.session_speakers(session_id);

alter table public.session_speakers enable row level security;

create policy "Organizers can manage session_speakers"
  on public.session_speakers for all
  to authenticated
  using (
    session_id in (
      select s.id from public.agenda_sessions s
      join public.events e on s.event_id = e.id
      where e.organization_id in (
        select organization_id from public.organization_members
        where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
      )
    )
  );

create policy "Participants can view session_speakers"
  on public.session_speakers for select
  to authenticated
  using (
    session_id in (
      select s.id from public.agenda_sessions s
      where s.event_id in (
        select event_id from public.participants
        where user_id = auth.uid() and status = 'approved'
      )
    )
  );

create policy "Public can view session_speakers for published events"
  on public.session_speakers for select
  using (
    session_id in (
      select s.id from public.agenda_sessions s
      where s.event_id in (select id from public.events where status = 'published')
    )
  );

-- ============================================================

-- Attendee Schedule (participant's saved sessions)
create table if not exists public.attendee_schedule (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id uuid not null references public.agenda_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_id, session_id)
);

create index if not exists attendee_schedule_participant_id_idx on public.attendee_schedule(participant_id);
create index if not exists attendee_schedule_session_id_idx on public.attendee_schedule(session_id);

alter table public.attendee_schedule enable row level security;

create policy "Participants can manage their own schedule"
  on public.attendee_schedule for all
  to authenticated
  using (
    participant_id in (
      select id from public.participants where user_id = auth.uid()
    )
  );
