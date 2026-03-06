# B2Pair Launch-Blocker Checklist

Date: 2026-03-06
Target: minimum safe changes before public launch

## P0: must fix before launch

### 1. Protect privileged AI and matching routes

Files:

- `src/app/api/matching/generate/route.ts`
- `src/app/api/intent/compute/route.ts`
- `src/app/api/intent/classify/route.ts`
- `src/app/api/embeddings/generate/route.ts`

Fix:

- require authenticated user
- verify caller is organizer for the target event
- reject all non-organizer callers with `403`
- centralize service-role usage through `src/lib/supabase/admin.ts`

Acceptance criteria:

- unauthenticated request returns `401`
- authenticated non-organizer request returns `403`
- authenticated organizer request still works

Effort:

- 2 to 4 hours

### 2. Add organizer authorization to event admin endpoints

Files:

- `src/app/api/events/[eventId]/badge-participants/route.ts`
- `src/app/api/events/[eventId]/badge-config/route.ts`
- `src/app/api/events/[eventId]/analytics/route.ts`
- `src/app/api/events/[eventId]/overview/route.ts`

Fix:

- enforce `isEventOrganizer(...)` or equivalent org-member permission check before using admin queries
- do not expose attendee email or QR data to regular authenticated users

Acceptance criteria:

- normal attendee cannot fetch badge data, analytics, or badge config for someone else’s event
- organizer can still access all endpoints

Effort:

- 2 to 3 hours

### 3. Lock down check-in

File:

- `src/app/api/checkin/route.ts`

Fix options:

- safest: disable unauthenticated kiosk POST entirely for launch
- or require a per-event kiosk secret/token
- if email/manual lookup remains, require organizer auth or valid kiosk secret
- require organizer auth for DELETE
- require organizer auth for stats/list mode in GET

Acceptance criteria:

- arbitrary public caller cannot check in by email or participant id
- arbitrary authenticated attendee cannot view full event check-in list
- undo check-in only works for organizer or kiosk admin flow

Effort:

- 3 to 5 hours

### 4. Enforce meeting workflow rules

File:

- `src/app/api/meetings/route.ts`

Fix:

- validate allowed transitions explicitly
- only recipient can accept/decline pending requests
- requester can cancel pending/accepted meetings they own
- only participants who attended can submit rating after accepted/completed meeting
- verify recipient belongs to the same event during create
- optionally prevent self-meetings and duplicate pending meetings

Acceptance criteria:

- requester cannot self-accept
- unrelated participant cannot be used as recipient
- invalid state transitions return `400` or `403`

Effort:

- 3 to 5 hours

### 5. Validate message sender against conversation membership

Files:

- `src/app/api/messages/send/route.ts`
- `src/app/api/messages/upload/route.ts`

Fix:

- load the conversation server-side
- verify `senderId` is one of `participant_a_id` or `participant_b_id`
- verify authenticated user owns that participant id
- reject cross-conversation injection

Acceptance criteria:

- user cannot post into a conversation they do not belong to
- user cannot spoof a participant id they do not own

Effort:

- 2 to 3 hours

### 6. Fix or disable broken organizer features

Files:

- `src/app/api/events/duplicate/route.ts`
- `src/app/api/meetings/auto-schedule/route.ts`

Fix:

- replace `organizer_id` checks with `created_by` or a shared organizer helper
- make duplicate generate a unique slug
- make auto-schedule insert valid `meeting_type` values
- or temporarily remove these controls from UI and block the routes

Acceptance criteria:

- duplicate event succeeds with a unique slug
- auto-schedule either works end-to-end or is deliberately unavailable

Effort:

- 2 to 4 hours

### 7. Upgrade Next.js

File:

- `package.json`

Fix:

- upgrade `next` from `15.1.11` to a patched version, at minimum the audit-recommended `15.5.12`
- rerun build smoke test after upgrade

Acceptance criteria:

- `npm audit` no longer reports the critical Next.js advisory
- app still compiles

Effort:

- 1 to 2 hours

## P1: strongly recommended before launch

### 8. Decide what “AI-powered matching” means in practice

Files:

- `src/app/api/matching/generate/route.ts`
- `src/app/api/intent/compute/route.ts`
- `src/app/api/intent/classify/route.ts`

Issue:

- the system computes vectors/classifications, but final match scoring mostly uses explicit intents and ignores stored vectors/confidence

Decision options:

- if launching tomorrow: update copy/UI to match actual behavior
- or wire computed vectors/confidence into score generation now

Acceptance criteria:

- product claim and implementation agree

Effort:

- 1 hour for copy/positioning fix
- 4 to 8 hours for real scoring rewrite and validation

### 9. Fix attachment persistence

File:

- `src/app/api/messages/upload/route.ts`

Fix:

- store storage path in DB, not a 7-day signed URL
- generate fresh signed URLs on read

Acceptance criteria:

- old attachments continue working after 7 days

Effort:

- 2 to 4 hours

### 10. Protect public utility routes from abuse

Files:

- `src/app/api/revalidate/route.ts`
- `src/app/api/participants/suggest-profile/route.ts`
- `src/app/api/auth/create-account/route.ts`

Fix:

- require secret or admin auth for revalidate
- add auth, captcha, or rate limiting to account creation
- add auth or rate limiting to suggest-profile

Acceptance criteria:

- these routes cannot be spammed anonymously

Effort:

- 2 to 4 hours

## P2: launch-week cleanup

### 11. Add a minimal smoke test pass

Suggested coverage:

- register for event
- create/update participant profile
- view matches
- request/accept meeting
- send message
- organizer badge export
- organizer check-in

Effort:

- 4 to 8 hours, depending on tooling

### 12. Resolve hook dependency warnings on critical pages

Focus pages:

- dashboard messaging
- onboarding
- availability
- editor

Effort:

- 1 to 3 hours

## Recommended execution order

1. Protect privileged AI/admin routes
2. Lock down check-in
3. Fix meetings and messaging integrity
4. Fix or disable duplicate and auto-schedule
5. Upgrade Next.js
6. Decide AI matching positioning vs implementation
7. Handle attachment persistence and public utility route abuse

## Go/No-Go Rule

No-go if any of these remain unfixed:

- public privileged AI/admin endpoints
- public or weakly protected check-in
- invalid meeting workflow rules
- cross-conversation message injection
- broken duplicate/auto-schedule features still exposed
- critical Next.js advisory still present
