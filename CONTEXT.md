# B2Pair Development Context

## What is B2Pair?
AI-powered B2B event matchmaking platform. Organizers create events, participants register through event pages, AI matches them, they schedule meetings and message each other.

## Stack
Next.js 15.1.11, React 19, TypeScript, shadcn/ui + Tailwind, Supabase, Vercel

## Credentials
- **Supabase URL:** https://eemeremqmqsqsxioycka.supabase.co
- **Supabase Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbWVyZW1xbXFzcXN4aW95Y2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTA0NDEsImV4cCI6MjA4NzI4NjQ0MX0.1kkkNdv-EabR4iwjkqoxa7uuxstYWVYv5kNQDsVcm8c
- **Supabase Service Role:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbWVyZW1xbXFzcXN4aW95Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTcxMDQ0MSwiZXhwIjoyMDg3Mjg2NDQxfQ.lVC91lJiD_rj1xJX7bklskVq_3fcuinyeRq0BRRP2o4
- **Supabase Mgmt Token:** sbp_2e7b5f223a191632000fd43c7d2ce6112ed0e17d
- **GitHub:** JarvisSterling/b2pair (token in TOOLS.md)
- **Vercel:** prj_lZUy8DhjCCrIFtVkbQyoCtLRvhf1 (token in TOOLS.md)
- **Live:** https://b2pair.vercel.app

## Local Repo
C:\Users\Kiro\.openclaw\workspace\b2pair

## Task Tracker
C:\Users\Kiro\.openclaw\workspace\b2pair-TASKS.md

## Design System
Apple-inspired. Minimal, elegant, calm. Neutral palette. SF Pro font stack. Soft rounded corners. Subtle shadows. 150-250ms transitions. Lucide icons. Dark mode ready.

## Architecture Decisions
- **Admin client** (src/lib/supabase/admin.ts): bypasses RLS for public pages and user creation
- **useEventId hook**: route-agnostic event ID (works on /dashboard/events/[id] and /dashboard/w/[workspaceId]/events/[eventId])
- **useParticipantPerms hook**: permission checking per participant type (defaults false until loaded)
- **Registration API** (/api/events/register): admin.auth.admin.createUser (auto-confirms, no email verification)
- **Dashboard shell** handles 4 layouts: organizer workspace, organizer event, participant home (header only), participant event (sidebar)
- **SECURITY DEFINER functions**: get_user_org_ids(), get_user_event_ids(), get_user_created_event_ids()
- **Local git workflow**: clone at workspace/b2pair, git add/commit/push directly (saves tokens vs GitHub API)

## Key Routes
- `/` - Landing page (organizer-focused)
- `/events/[slug]` - Public event page (admin client for RLS bypass)
- `/events/[slug]/registered` - Registration confirmation
- `/auth/sign-in`, `/auth/sign-up` - Auth pages
- `/onboarding` - Organizer onboarding (4 steps)
- `/dashboard` - Router (organizers → workspace, participants → /dashboard/home)
- `/dashboard/home` - Participant events feed
- `/dashboard/w/new` - Create workspace
- `/dashboard/w/[workspaceId]` - Workspace overview
- `/dashboard/w/[workspaceId]/events/[eventId]` - Organizer event control panel
- `/dashboard/w/[workspaceId]/events/[eventId]/configure` - Event settings
- `/dashboard/w/[workspaceId]/events/[eventId]/participants` - Participant management (with profile slide-out)
- `/dashboard/w/[workspaceId]/events/[eventId]/participant-types` - Custom roles per event
- `/dashboard/w/[workspaceId]/events/[eventId]/matching` - Matching rules config
- `/dashboard/events/[id]` - Participant event dashboard
- `/dashboard/events/[id]/matches` - Match recommendations
- `/dashboard/events/[id]/meetings` - Meetings (with request modal via ?request= param)
- `/dashboard/events/[id]/messages` - Direct messaging (with ?to= param)
- `/dashboard/events/[id]/directory` - Participant directory
- `/dashboard/events/[id]/availability` - Availability calendar
- `/dashboard/complete-profile` - Minimal participant profile completion

## Phase Status
- **Phase 1:** 38/38 ✅
- **Phase 2A:** 16/17 ✅ (Participant Flow Rework + Event Pages) — T10-6 absorbed into 2B, T11-5 on hold until domain
- **Phase 2B:** 0/27 — Event Page Builder (tabs, custom pages, themes, media uploads) ← CURRENT
- **Phase 2C:** TBD — Agenda, Analytics, Sponsor Tools
- **Phase 3:** Advanced Features
- **Phase 4:** Scale & Monetization

## What's Next
1. **Phase 2B: Event Page Builder** — Start with Stage 13 (DB & storage foundation)
2. Availability calendar drag-to-select needs testing (offset fix deployed)
3. Meeting calendar sidebar/back button fix needs testing
4. T11-5: CSV bulk invite (after domain)
5. Email integration with Resend (after domain)
6. Custom domain setup

## Known Test Accounts
- **Don (organizer):** donniberisha@gmail.com, user ID d1d2978a-db2f-4fcf-b0bf-55215e647a1f
- **Kujtim (test participant):** kujtim@example.com (Buyer type, had meetings/messages revoked for testing)
- **Skender:** skenderrama@zohomail.com (manually confirmed)

## Code Quality Rules
- No slop code, neat and high-quality
- No dashes (—) in replies
- Apple-inspired design consistency
- Permissions enforced everywhere (sidebar, cards, buttons)
- useParticipantPerms defaults false until loaded (no flash)
