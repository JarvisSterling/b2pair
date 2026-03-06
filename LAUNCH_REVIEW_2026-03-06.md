# B2Pair Launch Review

Date: 2026-03-06
Repo: `JarvisSterling/b2pair`
Reviewer: Codex

## Findings

### 1. Critical: privileged AI and matching routes are publicly callable

The app middleware treats all `/api/*` routes as public, and several handlers create service-role Supabase clients without any auth or organizer check:

- `src/lib/supabase/middleware.ts`
- `middleware.ts`
- `src/app/api/matching/generate/route.ts`
- `src/app/api/intent/compute/route.ts`
- `src/app/api/intent/classify/route.ts`
- `src/app/api/embeddings/generate/route.ts`

Impact:

- Anyone who can hit those endpoints can regenerate matches, vectors, AI classifications, and embeddings for arbitrary events.
- These routes can spend OpenAI credits and perform large database writes with no access control.

### 2. Critical: organizer-only admin endpoints are missing organizer authorization

Several event admin endpoints only check that the caller is authenticated, then use the admin client and bypass RLS:

- `src/app/api/events/[eventId]/badge-participants/route.ts`
- `src/app/api/events/[eventId]/badge-config/route.ts`
- `src/app/api/events/[eventId]/analytics/route.ts`
- `src/app/api/events/[eventId]/overview/route.ts`

Impact:

- Any authenticated user can read event-wide analytics.
- Any authenticated user can read attendee badge data, including emails and QR tokens.
- Any authenticated user can modify badge configuration for arbitrary events.

### 3. Critical: public kiosk check-in can check in arbitrary people

`src/app/api/checkin/route.ts` deliberately uses the admin client for unauthenticated kiosk flows, but accepts `token`, `email`, or `participantId` with no kiosk secret or organizer auth.

This bypasses the intended organizer-only insert/delete rules in:

- `supabase/migrations/20260304_add_checkin_qr.sql`

Impact:

- Anyone with an `eventId` and a known or guessed participant email or id can mark attendees checked in.
- The route also returns participant profile data in the response.

### 4. High: meeting status transitions are not enforced

`src/app/api/meetings/route.ts` lets any meeting participant write arbitrary `status` values once they are part of a meeting.

The RLS policy in `schema.sql` only ensures the caller is one side of the meeting, not that the transition is valid:

- requester can self-accept
- either side can mark `completed`
- either side can mark `no_show`
- cancellation/decline/accept rules are not role-scoped

Impact:

- Meeting workflow integrity is weak.
- Analytics based on meeting state can be manipulated by participants.

### 5. High: meeting creation does not verify event consistency

`src/app/api/meetings/route.ts` verifies the requester belongs to the event, but does not verify `recipientParticipantId` belongs to the same event.

The `meetings` table in `schema.sql` has independent foreign keys for requester/recipient but no event-consistency constraint.

Impact:

- Cross-event meetings are possible if a valid participant id is supplied.

### 6. High: messaging allows cross-conversation injection

Both message routes trust `conversationId` and `senderId` from the client:

- `src/app/api/messages/send/route.ts`
- `src/app/api/messages/upload/route.ts`

The `messages` insert policy only checks that `sender_id` belongs to the authenticated user. It does not verify that `sender_id` belongs to the referenced conversation:

- `schema.sql`

Impact:

- A user can inject messages or attachments into a conversation they do not belong to, as long as they use their own participant id as sender.

### 7. High: chat attachments expire after 7 days

`src/app/api/messages/upload/route.ts` stores a signed URL in `messages.file_url` instead of a storage path and generates it for 7 days only.

Impact:

- Older attachments will stop working after one week.
- Historical message threads lose files permanently unless a new URL-generation path is added.

### 8. High: duplicate-event and auto-schedule look broken against the current schema

`src/app/api/events/duplicate/route.ts` and `src/app/api/meetings/auto-schedule/route.ts` both reference `organizer_id`, but the schema uses `created_by` on events.

Additional problems:

- duplicate route reuses the original `slug`, which is unique per organization
- auto-schedule inserts `meeting_type: "scheduled"`, but the schema only allows `in-person` or `virtual`

Impact:

- These organizer features likely fail at runtime.

### 9. High: the AI/behavioral intent pipeline is mostly not used by match scoring

The system computes and stores:

- intent vectors
- confidence
- AI intent classifications
- behavioral signals

But `src/app/api/matching/generate/route.ts` does not use the computed vectors in final scoring. It calculates them and stores them, then scores intent from explicit intents only via `computeDirectIntentScore`, defaulting to `40` when no explicit intents exist.

The route also loads `confidenceThreshold` but never uses it.

Impact:

- The implementation does not match the implied product claim that AI/behavioral intent logic is driving the actual match score.
- Participants with sparse explicit intent data can get low-quality scoring even after expensive compute passes.

### 10. Medium: more public abuse surfaces exist

Notable routes:

- `src/app/api/revalidate/route.ts` lets anyone revalidate arbitrary paths
- `src/app/api/participants/suggest-profile/route.ts` is public and can spend OpenAI tokens
- `src/app/api/auth/create-account/route.ts` publicly creates auto-confirmed accounts

Impact:

- Cache invalidation abuse
- OpenAI spend abuse
- account creation abuse/spam

### 11. Medium: dependency posture is not launch-ready

`package.json` pins:

- `next: 15.1.11`

`npm audit` reports a critical advisory on this line, including a middleware authorization-bypass issue. Audit recommends upgrading to `15.5.12`.

### 12. Medium: validation signals are limited

Observations:

- no test files present
- build emits multiple React hook dependency warnings
- production build compiled, linted, type-checked, and generated pages, but failed at the final step in this environment with `EXDEV` during `.next` file rename

This last error looks environment-specific rather than an app compile failure, but it still means I do not have a clean end-to-end build success artifact from this environment.

## How It’s Built

This is a sizable Next.js 15 + Supabase app with these main subsystems:

- Public event websites driven by `event_pages` and `event_themes`
- Multi-step event registration and profile completion
- Participant matching built on `participants`, `matches`, `participant_activity`, optional OpenAI classification, and optional embeddings
- Meeting requests, scheduling, reminders, messaging, and notifications
- Sponsor/exhibitor/company onboarding and dashboards
- Badge and QR check-in flows
- Organizer dashboards and a page editor

The overall feature scope is substantial and the product is not superficial. The codebase has real workflow depth. The biggest problem is trust boundaries on server routes and a few stale schema assumptions in organizer features.

## Launch Assessment

I would not ship this publicly as-is.

Minimum blockers before go-live:

1. Lock down all privileged `/api` routes, especially matching/AI, badge, analytics, and check-in.
2. Fix or disable duplicate-event and auto-schedule.
3. Fix meeting status-transition rules and message conversation membership validation.
4. Decide whether the current matching behavior is acceptable, because the stored AI/behavioral pipeline is not actually driving scores the way the code suggests.
5. Upgrade `next` off `15.1.11`.

## Verification Notes

I ran the following checks in the local review copy:

- `npm ci`
- `npm run build`
- `npm run type-check`
- `npm audit --json`

Results:

- dependency install succeeded
- `npm audit` reported 1 critical and 1 high vulnerability
- build compiled and generated pages, but failed at the final filesystem rename step with `EXDEV`
- `npm run type-check` succeeded in the original clone after Next-generated types existed; rerunning against a copied workspace without regenerated `.next/types` failed because those generated files were missing
