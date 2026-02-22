-- ============================================================
-- B2Pair Database Schema
-- AI-Powered B2B Event Matchmaking Platform
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  title text,
  bio text,
  company_name text,
  company_size text check (company_size in ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  company_website text,
  industry text,
  expertise_areas text[] default '{}',
  interests text[] default '{}',
  linkedin_url text,
  twitter_url text,
  website_url text,
  onboarding_completed boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  website text,
  description text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'manager', 'member')),
  created_at timestamptz default now() not null,
  unique(organization_id, user_id)
);

-- ============================================================
-- EVENTS
-- ============================================================

create table public.events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  slug text not null,
  description text,
  event_type text not null check (event_type in ('conference', 'tradeshow', 'summit', 'networking', 'workshop', 'hybrid')),
  format text not null check (format in ('in-person', 'virtual', 'hybrid')) default 'in-person',
  status text not null check (status in ('draft', 'published', 'active', 'completed', 'cancelled')) default 'draft',
  
  -- Dates
  start_date timestamptz not null,
  end_date timestamptz not null,
  timezone text not null default 'UTC',
  
  -- Location
  venue_name text,
  venue_address text,
  city text,
  country text,
  virtual_url text,
  
  -- Branding
  banner_url text,
  logo_url text,
  primary_color text default '#0071E3',
  
  -- Settings
  max_participants integer,
  registration_open boolean default true,
  requires_approval boolean default false,
  meeting_duration_minutes integer default 30,
  max_meetings_per_participant integer default 20,
  break_between_meetings integer default 5,
  
  -- Metadata
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  unique(organization_id, slug)
);

-- ============================================================
-- EVENT PARTICIPANTS
-- ============================================================

create table public.participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Role at this event
  role text not null check (role in ('attendee', 'exhibitor', 'sponsor', 'speaker', 'organizer')) default 'attendee',
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')) default 'pending',
  
  -- Event-specific profile
  intent text check (intent in ('buying', 'selling', 'investing', 'partnering', 'learning', 'networking')),
  looking_for text,
  offering text,
  tags text[] default '{}',
  
  -- Availability
  available_slots jsonb default '[]',
  max_meetings integer,
  
  -- Engagement
  checked_in boolean default false,
  checked_in_at timestamptz,
  
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  unique(event_id, user_id)
);

-- ============================================================
-- PROFILE EMBEDDINGS (for AI matching)
-- ============================================================

create table public.profile_embeddings (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid references public.participants(id) on delete cascade not null unique,
  embedding vector(1536),
  embedding_text text,
  model text default 'text-embedding-3-small',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- MATCHES
-- ============================================================

create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  participant_a_id uuid references public.participants(id) on delete cascade not null,
  participant_b_id uuid references public.participants(id) on delete cascade not null,
  
  -- Scoring
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  intent_score numeric(5,2) default 0,
  industry_score numeric(5,2) default 0,
  interest_score numeric(5,2) default 0,
  complementarity_score numeric(5,2) default 0,
  
  -- Explanation
  match_reasons jsonb default '[]',
  
  -- Status
  status text not null check (status in ('suggested', 'viewed', 'saved', 'dismissed', 'connected')) default 'suggested',
  
  created_at timestamptz default now() not null,
  
  -- Ensure no duplicate pairs
  unique(event_id, participant_a_id, participant_b_id),
  check(participant_a_id < participant_b_id)
);

-- ============================================================
-- MEETINGS
-- ============================================================

create table public.meetings (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  
  -- Participants
  requester_id uuid references public.participants(id) on delete cascade not null,
  recipient_id uuid references public.participants(id) on delete cascade not null,
  
  -- Status
  status text not null check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed', 'no_show')) default 'pending',
  
  -- Schedule
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer not null default 30,
  
  -- Location
  meeting_type text not null check (meeting_type in ('in-person', 'virtual')) default 'in-person',
  location text,
  room text,
  virtual_link text,
  
  -- Context
  agenda_note text,
  decline_reason text,
  
  -- Feedback
  requester_rating integer check (requester_rating >= 1 and requester_rating <= 5),
  recipient_rating integer check (recipient_rating >= 1 and recipient_rating <= 5),
  requester_feedback text,
  recipient_feedback text,
  
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================

create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  participant_a_id uuid references public.participants(id) on delete cascade not null,
  participant_b_id uuid references public.participants(id) on delete cascade not null,
  last_message_at timestamptz,
  created_at timestamptz default now() not null,
  
  unique(event_id, participant_a_id, participant_b_id),
  check(participant_a_id < participant_b_id)
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.participants(id) on delete cascade not null,
  content text not null,
  content_type text not null check (content_type in ('text', 'file', 'system')) default 'text',
  file_url text,
  file_name text,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete set null,
  
  type text not null check (type in (
    'meeting_request', 'meeting_accepted', 'meeting_declined',
    'meeting_reminder', 'meeting_cancelled',
    'new_match', 'new_message',
    'event_update', 'registration_approved', 'registration_rejected',
    'system'
  )),
  
  title text not null,
  body text,
  link text,
  read boolean default false,
  created_at timestamptz default now() not null
);

-- ============================================================
-- MATCHING RULES (organizer configurable)
-- ============================================================

create table public.matching_rules (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null unique,
  
  -- Weights (must sum to ~1.0, but we normalize anyway)
  intent_weight numeric(3,2) default 0.35,
  industry_weight numeric(3,2) default 0.25,
  interest_weight numeric(3,2) default 0.25,
  complementarity_weight numeric(3,2) default 0.15,
  
  -- Thresholds
  minimum_score numeric(5,2) default 40,
  max_recommendations integer default 50,
  
  -- Exclusion rules
  exclude_same_company boolean default true,
  exclude_same_role boolean default false,
  
  -- Priority
  prioritize_sponsors boolean default true,
  prioritize_vip boolean default true,
  
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_profiles_email on public.profiles(email);
create index idx_org_members_user on public.organization_members(user_id);
create index idx_org_members_org on public.organization_members(organization_id);
create index idx_events_org on public.events(organization_id);
create index idx_events_status on public.events(status);
create index idx_participants_event on public.participants(event_id);
create index idx_participants_user on public.participants(user_id);
create index idx_participants_event_status on public.participants(event_id, status);
create index idx_matches_event on public.matches(event_id);
create index idx_matches_participant_a on public.matches(participant_a_id);
create index idx_matches_participant_b on public.matches(participant_b_id);
create index idx_matches_event_score on public.matches(event_id, score desc);
create index idx_meetings_event on public.meetings(event_id);
create index idx_meetings_requester on public.meetings(requester_id);
create index idx_meetings_recipient on public.meetings(recipient_id);
create index idx_meetings_status on public.meetings(status);
create index idx_meetings_time on public.meetings(start_time);
create index idx_conversations_event on public.conversations(event_id);
create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_created on public.messages(created_at);
create index idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.organizations
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.events
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.participants
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.profile_embeddings
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.meetings
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.matching_rules
  for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.profile_embeddings enable row level security;
alter table public.matches enable row level security;
alter table public.meetings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.matching_rules enable row level security;

-- Profiles: users can read any profile, update own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Organizations: members can view, owners/admins can update
create policy "Org members can view organization"
  on public.organizations for select
  to authenticated
  using (
    id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

create policy "Org owners can insert organizations"
  on public.organizations for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Org admins can update organization"
  on public.organizations for update
  to authenticated
  using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Organization members: members can view, admins can manage
create policy "Members can view org members"
  on public.organization_members for select
  to authenticated
  using (
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

create policy "Admins can manage org members"
  on public.organization_members for all
  to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Events: published events visible to all authenticated, draft only to org members
create policy "Published events are viewable"
  on public.events for select
  to authenticated
  using (
    status != 'draft' or
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

create policy "Org members can create events"
  on public.events for insert
  to authenticated
  with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

create policy "Org members can update events"
  on public.events for update
  to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Participants: event participants can view each other
create policy "Event participants can view participants"
  on public.participants for select
  to authenticated
  using (
    event_id in (select event_id from public.participants where user_id = auth.uid() and status = 'approved')
    or
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid()
    )
  );

create policy "Users can register as participant"
  on public.participants for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own participation"
  on public.participants for update
  to authenticated
  using (
    user_id = auth.uid()
    or
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin', 'manager')
    )
  );

-- Matches: participants can see their own matches
create policy "Participants can view their matches"
  on public.matches for select
  to authenticated
  using (
    participant_a_id in (select id from public.participants where user_id = auth.uid())
    or
    participant_b_id in (select id from public.participants where user_id = auth.uid())
  );

-- Meetings: participants can see their own meetings
create policy "Participants can view their meetings"
  on public.meetings for select
  to authenticated
  using (
    requester_id in (select id from public.participants where user_id = auth.uid())
    or
    recipient_id in (select id from public.participants where user_id = auth.uid())
  );

create policy "Participants can create meeting requests"
  on public.meetings for insert
  to authenticated
  with check (
    requester_id in (select id from public.participants where user_id = auth.uid())
  );

create policy "Meeting participants can update meetings"
  on public.meetings for update
  to authenticated
  using (
    requester_id in (select id from public.participants where user_id = auth.uid())
    or
    recipient_id in (select id from public.participants where user_id = auth.uid())
  );

-- Conversations: participants can see their conversations
create policy "Participants can view their conversations"
  on public.conversations for select
  to authenticated
  using (
    participant_a_id in (select id from public.participants where user_id = auth.uid())
    or
    participant_b_id in (select id from public.participants where user_id = auth.uid())
  );

create policy "Participants can create conversations"
  on public.conversations for insert
  to authenticated
  with check (
    participant_a_id in (select id from public.participants where user_id = auth.uid())
    or
    participant_b_id in (select id from public.participants where user_id = auth.uid())
  );

-- Messages: conversation participants can see messages
create policy "Conversation participants can view messages"
  on public.messages for select
  to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where participant_a_id in (select id from public.participants where user_id = auth.uid())
         or participant_b_id in (select id from public.participants where user_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id in (select id from public.participants where user_id = auth.uid())
  );

-- Notifications: users can see their own
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

-- Profile embeddings: same visibility as participants
create policy "Embeddings follow participant visibility"
  on public.profile_embeddings for select
  to authenticated
  using (
    participant_id in (
      select p.id from public.participants p
      where p.event_id in (select event_id from public.participants where user_id = auth.uid())
    )
  );

-- Matching rules: org members can view and manage
create policy "Org members can view matching rules"
  on public.matching_rules for select
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid()
    )
  );

create policy "Org admins can manage matching rules"
  on public.matching_rules for all
  to authenticated
  using (
    event_id in (
      select e.id from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.meetings;
