# B2Pair Codebase Audit

**Date:** 2026-02-26
**Reviewed by:** Mango (AI code reviewer)
**Scope:** Full codebase — 169 files, ~36,700 lines

---

## Executive Summary

B2Pair is a well-structured, feature-rich event matchmaking platform built on Next.js 15, Supabase, SWR, TipTap, and @dnd-kit. The intent engine is genuinely clever — a real competitive moat. However, several API routes lack proper auth guards, monster page files need splitting, and there are no generated Supabase types, meaning DB schema changes silently break things at runtime instead of compile time.

**TypeScript:** ✅ Zero type errors on build
**Build:** ✅ All 60+ routes compile successfully

---

## 🔴 Critical (fix before production)

### 1. Unprotected API Routes
- `api/matching/generate/route.ts` — creates its own admin client directly (`createClient(URL, SERVICE_KEY)`) instead of checking the caller's auth. Anyone who knows the endpoint can trigger match generation for any event.
- `api/intent/compute/route.ts` — same pattern. No auth check whatsoever.
- `api/embeddings/generate/route.ts` — likely same issue.

**Fix:** Add auth middleware or at minimum verify the caller is an event organizer before processing.

### 2. Service Role Key Exposure Risk
- Multiple routes use `process.env.SUPABASE_SERVICE_ROLE_KEY!` with `!` assertion and construct admin clients inline.
- If someone accidentally adds `"use client"` to one of these files, the service key leaks to the browser.

**Fix:** Centralize all admin client creation in `lib/supabase/admin.ts` (already exists). Never use raw `createClient` with the service key elsewhere. Add an ESLint rule to flag `SUPABASE_SERVICE_ROLE_KEY` usage outside `admin.ts`.

### 3. No Rate Limiting
- `api/meetings/route.ts`, `api/messages/upload/route.ts`, `api/contacts/exchange/route.ts` — all can be spammed without limit.
- Meeting requests, message sends, and contact exchanges are abuse-prone endpoints.

**Fix:** Add rate limiting middleware (e.g., `@upstash/ratelimit` with Vercel KV).

---

## 🟠 Major (fix soon)

### 4. Monster Files Need Splitting
| File | Lines | Suggested Split |
|------|-------|----------------|
| `dashboard/w/.../partners/page.tsx` | 1,283 | PartnerList, PartnerInviteForm, PartnerOnboardWizard, PartnerStatusCard, PartnerFilters |
| `events/[slug]/register/registration-flow.tsx` | 953 | StepIndicator, PersonalInfoStep, CompanyStep, IntentStep, ReviewStep |
| `events/[slug]/partners/onboard/[code]/page.tsx` | 930 | OnboardLayout, CompanyInfoForm, TeamSetup, SubmitReview |
| `dashboard/w/.../agenda/page.tsx` | 912 | AgendaTimeline, SessionCard, SessionEditor, AgendaFilters |
| `page-editor/full-screen-editor.tsx` | 817 | EditorToolbar, EditorCanvas, EditorSidebar, BlockInserter |

**Target:** Each file should be under 300 lines.

### 5. No Supabase Generated Types
- All database queries use `any` types. Schema changes (renamed columns, new tables) break silently at runtime.
- The codebase has local interfaces scattered across files but no single source of truth.

**Fix:** Run `supabase gen types typescript --project-id <id> > src/types/database.ts` and type all Supabase client calls.

### 6. Duplicate Messaging Pages
- `dashboard/messages/page.tsx` (534 lines) and `dashboard/events/[id]/messages/page.tsx` (621 lines) are nearly identical implementations.
- Both implement conversation list, message thread, file upload, and realtime subscription.

**Fix:** Extract a shared `<ConversationView>` component used by both pages.

### 7. N+1 / O(n²) Risk in Matching
- `api/matching/generate` fetches ALL participants, then does pairwise comparison in JS.
- At 1,000 participants: 499,500 comparisons in a single HTTP request.
- At 5,000 participants: 12.5M comparisons — will timeout.

**Fix:** Run matching as a background job (Supabase Edge Function or cron). Paginate results. Consider DB-side scoring with `pgvector` cosine similarity.

### 8. No Error Boundaries
- Only root `error.tsx` exists. A crash in one dashboard page takes down the entire app.

**Fix:** Add `error.tsx` in `/dashboard/`, `/editor/`, and `/events/[slug]/`.

---

## 🟡 Minor (nice to have)

### 9. Puppeteer Dependency
- `puppeteer` is in production deps for PDF generation (`generate-pdf.mjs`).
- It's ~400MB, breaks on serverless (Vercel), and is overkill for this use case.

**Fix:** Replace with `@react-pdf/renderer` or `jsPDF`.

### 10. No Tests
- Zero test files in the entire codebase.
- The intent engine (`lib/intent-engine.ts`) is the most testable and critical piece.

**Fix:** Add unit tests for intent engine, API route handlers, and the matching algorithm. Use Vitest (already Next.js compatible).

### 11. Bare README
- Current README is a single line: "B2Pair - AI-Powered B2B Event Matchmaking Platform"

**Fix:** Add setup instructions, architecture overview, env var documentation, and deployment guide.

### 12. Inconsistent Data Fetching
- Some pages use the new SWR hooks (`useSWRFetch`), others still use raw `useEffect` + `fetch` + `setState`.
- The SWR hooks are well-built but not adopted everywhere.

**Fix:** Migrate remaining `useEffect` fetchers to `useSWRFetch` for consistent caching and revalidation.

### 13. Loading States
- `Skeleton` component exists in `ui/skeleton.tsx` but most pages show a raw `<Loader2>` spinner.

**Fix:** Replace spinners with content-shaped skeletons for better perceived performance.

### 14. Stub Pages
- `events/[id]/availability/page.tsx` — 1 line (empty re-export)
- `events/[id]/meetings/calendar/page.tsx` — 1 line (empty re-export)

**Fix:** Implement or remove from navigation.

---

## 💚 Strengths

- **Intent Engine** — Well-designed intent taxonomy (buying, selling, investing, partnering, learning, networking) with compatibility matrix, weighted signal detection from titles/bios, and confidence scoring. This is genuinely sophisticated.
- **Realtime Hooks** — Clean `useRealtime` and `useRealtimeMulti` with automatic channel cleanup on unmount.
- **SWR Caching Layer** — `useSWRFetch` and `useSWRMultiFetch` are solid, reusable abstractions.
- **Server-Side Auth in Layouts** — Dashboard layout checks auth and redirects. Correct pattern.
- **Company RBAC** — `canAccessCompany()` with granular permission checks (view_analytics, view_leads, edit_company).
- **Active Bug Fixing** — Recent commit history shows rapid, focused fixes (image quality, RLS bypass, event seeding).
- **Clean TypeScript** — Zero type errors. Build passes cleanly.
- **Event Page Editor** — TipTap + DnD-kit integration with themes, blocks, and banners is ambitious and working.

---

## Recommended Priority Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Auth-guard unprotected API routes | 2h | 🔴 Security |
| 2 | Generate Supabase types | 1h | 🟠 Reliability |
| 3 | Add rate limiting | 2h | 🔴 Security |
| 4 | Split monster files (>800 lines) | 4h | 🟠 Maintainability |
| 5 | Extract shared messaging component | 2h | 🟠 DRY |
| 6 | Background job for matching | 4h | 🟠 Scalability |
| 7 | Add error boundaries | 1h | 🟡 UX |
| 8 | Tests for intent engine + APIs | 4h | 🟡 Reliability |
| 9 | Replace puppeteer | 2h | 🟡 Performance |
| 10 | Proper README | 1h | 🟡 DX |

---

*Generated from full file-by-file analysis of the B2Pair repository.*
