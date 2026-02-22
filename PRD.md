# B2Pair - Product Requirements Document

## AI-Powered B2B Event Matchmaking Platform

**Version:** 1.0
**Date:** February 21, 2026
**Status:** Draft
**Owner:** Don / Helix Dev

---

## 1. Vision & Overview

B2Pair is a modern, AI-powered B2B event matchmaking platform that connects the right people at business events. It replaces outdated networking methods with intelligent matching, seamless scheduling, and actionable analytics.

**Target Users:**
- **Event Organizers** who need to maximize attendee ROI and prove event value to sponsors
- **Attendees** (buyers, sellers, investors, startups) looking for relevant connections
- **Exhibitors & Sponsors** wanting measurable lead generation and brand visibility

**Market Context:**
Competitors (b2match, Brella, Converve, Grip, Eventdex) charge â‚¬3,000-15,000 per event as SaaS rental where clients own nothing. B2Pair can differentiate by offering a superior AI matching engine, better UX, and flexible pricing that gives organizers more control.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | shadcn/ui + Tailwind CSS (Apple-inspired neutral design system) |
| Icons | Lucide React (SF Symbols-like aesthetic) |
| State | Zustand |
| Data Fetching | React Query (TanStack Query) |
| Backend | Next.js API Routes + Supabase Edge Functions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email, social, magic link) |
| Real-time | Supabase Realtime (presence, broadcasts, DB changes) |
| File Storage | Supabase Storage (avatars, logos, documents) |
| AI/ML | OpenAI API for matching algorithm, embeddings for profile similarity |
| Deployment | Vercel |
| Email | Resend or Supabase built-in |
| Payments | Stripe (for ticketed events and premium plans) |

---

## 3. User Roles & Permissions

### 3.1 Platform Admin
- Full platform management
- Manage organizations, billing, feature flags
- View platform-wide analytics

### 3.2 Event Organizer (Org Admin)
- Create and manage events
- Configure matching rules and algorithms
- Manage participants (invite, approve, import)
- View event analytics and reporting
- Manage sponsors and exhibitor packages
- Control event branding and website

### 3.3 Event Manager (Org Member)
- Manage specific events assigned to them
- Handle day-of operations
- Moderate participant profiles and meetings

### 3.4 Attendee
- Register for events
- Complete onboarding profile (interests, goals)
- View and act on match recommendations
- Request, accept, decline meetings
- Chat with other participants
- Rate meetings and provide feedback

### 3.5 Exhibitor / Sponsor
- Manage company profile and product showcase
- View lead analytics
- Access lead retrieval tools
- Manage booth/virtual presence
- See meeting and engagement metrics

---

## 4. Feature Specification

### Phase 1: Foundation (MVP)

#### 4.1 Authentication & Onboarding
- Email/password registration with role selection
- Magic link authentication
- Social login (Google, LinkedIn)
- Email verification
- Intent-based onboarding wizard:
  - "What brings you to this event?" (looking to buy, sell, invest, partner, learn)
  - Industry selection (multi-select from taxonomy)
  - Interest tags and keywords
  - Company information (name, size, website, description)
  - Profile photo upload
  - Meeting availability windows
- Progressive profiling (can update later)

#### 4.2 Event Management (Organizer)
- Event creation wizard:
  - Basic info (name, description, dates, location/virtual)
  - Event type (conference, tradeshow, summit, networking, hybrid)
  - Branding (logo, colors, banner image)
  - Ticket types and pricing (free, paid via Stripe)
  - Registration form builder (custom fields)
- Event dashboard with key metrics
- Participant management:
  - Manual add, CSV/Excel import, invite via email
  - Approval workflow (auto-approve or manual review)
  - Participant categories/tags
  - Bulk actions (approve, reject, email, export)
- Event settings and configuration
- Duplicate event (template from previous)

#### 4.3 Participant Profiles & Directory
- Rich participant profiles:
  - Personal: name, title, company, bio, photo
  - Professional: industry, expertise areas, years of experience
  - Intent: what they're looking for, what they offer
  - Products/services catalog (for exhibitors)
  - Social links (LinkedIn, Twitter, website)
- Participant directory with search and filters:
  - Filter by role, industry, company size, tags, availability
  - Full-text search across profiles
  - Sort by match score, company, name
- Profile visibility controls (public within event, hidden, selective)
- Contact card exchange (share info with one click)

#### 4.4 AI Matchmaking Engine
- Profile embedding generation using AI (OpenAI embeddings)
- Multi-factor matching algorithm:
  - Intent alignment (buyer-seller, investor-startup, partner-partner)
  - Industry and expertise overlap
  - Interest tag intersection
  - Company complementarity (size, stage, geography)
  - Historical interaction data (if returning user)
- Match scoring with compatibility percentage (0-100%)
- Configurable matching rules per event:
  - Organizer defines which factors matter most (weighted)
  - Exclusion rules (don't match competitors, same company)
  - Priority matching (VIP attendees, sponsors)
  - Minimum score threshold for recommendations
- Match recommendation feed:
  - Top matches shown first
  - "Why you matched" explanation
  - Quick actions: request meeting, save for later, dismiss
  - Refresh/load more recommendations
- Swipe-style discovery mode (Tinder for B2B)

#### 4.5 Meeting Scheduling
- Meeting request flow:
  - Select available time slot
  - Add meeting purpose/agenda note
  - Send request with one click
- Meeting response: accept, decline (with optional reason), suggest alternative time
- Calendar view:
  - Day view with time slots
  - Visual meeting blocks with participant info
  - Drag to reschedule
  - Conflict detection
- Availability management:
  - Set available windows per day
  - Block specific times
  - Set max meetings per day
  - Break time between meetings
- Meeting types:
  - In-person (assigned table/room/location)
  - Virtual (auto-generate video link: Zoom, Teams, Meet)
  - Hybrid (both options)
- Meeting duration options (15min, 30min, 45min, 1hr)
- Auto-scheduling optimizer:
  - Given mutual availability, suggest optimal times
  - Minimize gaps, maximize meeting density
  - Respect travel time between locations (for in-person)
- Reminders: 24hr, 1hr, 15min before meeting (email + in-app + push)
- No-show tracking
- Post-meeting rating (1-5 stars + optional note)

#### 4.6 Messaging
- Direct messaging between participants
- Meeting context chat (discuss before/after meeting)
- Message notifications (in-app + email digest)
- Read receipts
- File sharing in chat (PDF, images)
- Report/block functionality

---

### Phase 2: Engagement & Analytics

#### 4.7 Event Agenda & Program
- Multi-track agenda builder:
  - Sessions (talks, panels, workshops, breaks)
  - Speaker profiles with session assignments
  - Room/stage assignments
  - Time slots with conflict detection
- Attendee agenda:
  - Browse full program
  - Add sessions to personal schedule
  - Conflict alerts with meetings
  - Session reminders
- Live session features:
  - Q&A feed
  - Live polls
  - Session rating

#### 4.8 Event Website Builder
- Template-based website generator:
  - Event landing page
  - Speaker showcase
  - Agenda page
  - Registration page
  - Sponsor logos
- Custom branding (colors, fonts, logo, favicon)
- Custom domain support
- Multi-language support (i18n)
- SEO optimization
- Embeddable registration widget

#### 4.9 Analytics Dashboard (Organizer)
- Real-time event metrics:
  - Total registrations, check-ins, active users
  - Meetings: requested, scheduled, completed, no-shows
  - Messages sent, connections made
  - Match acceptance rate
  - Average match score
- Engagement heatmap (most active times, popular sessions)
- Meeting matrix (who met whom, meeting quality)
- Participant engagement scores
- Matching effectiveness report:
  - How many matches led to meetings
  - Meeting satisfaction ratings
  - Follow-up rates
- Export reports (PDF, CSV, Excel)
- Scheduled email reports (daily/weekly during event)

#### 4.10 Sponsor & Exhibitor Tools
- Sponsor tiers (Platinum, Gold, Silver, Bronze) with configurable benefits:
  - Logo placement priority
  - Featured in recommendations ("promoted match")
  - Dedicated meeting slots
  - Analytics access level
  - Banner ad placements
- Exhibitor booth page:
  - Company showcase (description, products, team)
  - Product catalog with images
  - Document downloads (brochures, spec sheets)
  - Call-to-action buttons
  - Meeting booking directly from booth
- Lead retrieval:
  - QR code scanner (scan attendee badges)
  - Automatic lead capture from booth visits
  - Lead scoring and categorization
  - Notes per lead
  - Real-time lead dashboard
  - Export leads to CRM (CSV, HubSpot, Salesforce)
- Sponsor analytics:
  - Impressions (how many saw their brand)
  - Booth visits (virtual and in-person)
  - Meetings booked and completed
  - Lead quality distribution
  - ROI calculator

---

### Phase 3: Advanced Features

#### 4.11 Check-in & Onsite
- QR code generation per participant (in email + app)
- Self-service check-in kiosk mode
- Badge printing integration
- Real-time check-in dashboard
- Session room access control (scan to enter)
- Location tracking (optional, beacon-based)

#### 4.12 Networking Enhancements
- AI icebreaker suggestions ("You both invested in cleantech in 2025")
- Networking lounges (virtual rooms with video)
- Speed networking mode:
  - Auto-rotate participants every X minutes
  - Round-robin matching
  - Quick compatibility vote after each round
- Group matching (connect 3-5 people with shared interests)
- "Meet again" follow-up suggestions post-event

#### 4.13 Post-Event & Community
- Post-event survey builder
- Connection list with export
- Follow-up reminders ("You met Sarah from TechCo, follow up?")
- Content library (session recordings, slides, photos)
- Community mode:
  - Keep profiles and messaging active between events
  - Ongoing match recommendations
  - Discussion forums by topic
  - Resource sharing
- Event series management (annual events, recurring meetups)

#### 4.14 Integrations
- CRM: HubSpot, Salesforce (bi-directional sync)
- Calendar: Google Calendar, Outlook (export meetings)
- Video: Zoom, Google Meet, Microsoft Teams (auto-create links)
- Payment: Stripe (ticket sales, sponsor payments)
- Marketing: Mailchimp, SendGrid (attendee lists)
- Zapier/Webhooks for custom integrations
- SSO/SAML for enterprise clients
- REST API for third-party access

#### 4.15 Mobile Experience
- Progressive Web App (PWA) with offline support
- Push notifications
- QR code scanner (camera-based)
- Contact exchange via NFC (if supported)
- Location-aware recommendations (at in-person events)
- Offline agenda access

---

### Phase 4: Scale & Monetization

#### 4.16 Multi-tenant Platform
- Organization workspaces
- Multiple events per organization
- Team management with role-based access
- Billing and subscription management
- Usage quotas per plan tier

#### 4.17 Monetization
- Pricing tiers:
  - **Starter** (free): Up to 50 participants, basic matching, 1 event
  - **Professional** ($X/event): Up to 500 participants, AI matching, analytics, custom branding
  - **Enterprise** ($X/month): Unlimited events, API access, SSO, white-label, dedicated support
- Add-ons:
  - Lead retrieval tool ($X per exhibitor)
  - Custom domain ($X/event)
  - Priority support
  - API access
- Revenue share option for ticket sales

#### 4.18 Platform Admin Panel
- User and organization management
- Feature flag system
- Platform analytics (events created, active users, revenue)
- Content moderation tools
- Support ticket system
- Billing and invoice management

---

## 5. Database Schema (High-Level)

### Core Tables
- `organizations` - Platform tenants
- `org_members` - Team members with roles
- `events` - Event instances
- `event_settings` - Per-event configuration
- `participants` - Event registrations with profiles
- `participant_profiles` - Extended profile data (interests, intent, tags)
- `profile_embeddings` - AI-generated vector embeddings for matching

### Matching & Meetings
- `matches` - Computed match pairs with scores
- `match_factors` - Breakdown of why two profiles matched
- `meetings` - Scheduled meetings between participants
- `meeting_slots` - Available time slots
- `meeting_feedback` - Post-meeting ratings

### Communication
- `conversations` - Chat threads
- `messages` - Individual messages
- `notifications` - In-app notifications

### Event Content
- `agenda_tracks` - Multi-track program
- `agenda_sessions` - Individual sessions
- `speakers` - Speaker profiles
- `session_speakers` - Many-to-many
- `venues` - Physical locations
- `rooms` - Meeting rooms / stages

### Sponsors & Exhibitors
- `sponsor_tiers` - Tier definitions per event
- `sponsors` - Sponsor assignments
- `exhibitor_booths` - Booth pages and content
- `products` - Product catalog items
- `leads` - Captured leads
- `lead_notes` - Notes on leads

### Analytics
- `event_analytics` - Aggregated event metrics
- `participant_activity` - Activity tracking
- `check_ins` - Check-in records

### Platform
- `subscriptions` - Billing plans
- `invoices` - Payment records
- `feature_flags` - Per-org feature toggles

---

## 6. Non-Functional Requirements

### Performance
- Page load under 2 seconds
- Match computation under 5 seconds for 1,000 participants
- Real-time messaging latency under 500ms
- Support up to 10,000 concurrent participants per event

### Security
- Row Level Security (RLS) on all Supabase tables
- GDPR compliance (data export, deletion, consent)
- Data encryption at rest and in transit
- Rate limiting on all API endpoints
- Input validation (Zod schemas) on every endpoint
- XSS and CSRF protection
- Audit logging for sensitive actions

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Responsive design (mobile-first)

### Reliability
- 99.9% uptime target
- Database backups (daily)
- Error monitoring and alerting
- Graceful degradation when AI services are unavailable

---

## 7. Design System

### Philosophy
Clean, premium, Apple-inspired. Minimal, elegant, and calm. The UI should feel modern, quiet, and intentional, prioritizing clarity and refinement over decoration. Premium feel comes through spacing, typography, and restraint, not through loud colors, heavy shadows, busy layouts, or overdesigned components.

### Color Palette
Neutral palette built on white, near-white, grays, and near-black.

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FFFFFF` | Page background |
| `--surface` | `#F5F5F7` | Cards, panels, secondary surfaces |
| `--surface-elevated` | `#FFFFFF` | Modals, popovers, floating elements |
| `--border` | `rgba(0, 0, 0, 0.06)` | Thin, low-opacity borders |
| `--border-strong` | `rgba(0, 0, 0, 0.12)` | Active/focus borders |
| `--text-primary` | `#1D1D1F` | Headings, primary text |
| `--text-secondary` | `#6E6E73` | Descriptions, secondary labels |
| `--text-tertiary` | `#86868B` | Placeholders, disabled text |
| `--accent` | `#0071E3` | Primary actions, links (Apple blue) |
| `--accent-hover` | `#0077ED` | Hover state for accent |
| `--success` | `#34C759` | Success states, confirmations |
| `--warning` | `#FF9F0A` | Warnings, caution states |
| `--destructive` | `#FF3B30` | Errors, destructive actions |

### Typography
SF Pro as primary with system font stack fallback.

```css
font-family: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

| Level | Size | Weight | Line Height | Tracking |
|-------|------|--------|-------------|----------|
| Display | 34px | 700 | 1.1 | -0.02em |
| H1 | 28px | 600 | 1.2 | -0.015em |
| H2 | 22px | 600 | 1.25 | -0.01em |
| H3 | 17px | 600 | 1.3 | -0.005em |
| Body | 15px | 400 | 1.5 | 0 |
| Caption | 13px | 400 | 1.4 | 0.01em |
| Small | 11px | 500 | 1.3 | 0.02em |

### Border Radius
Soft rounded corners applied consistently across all elements.

| Element | Radius |
|---------|--------|
| Small controls (buttons, inputs, badges) | 10-12px |
| Cards, panels, containers | 14-18px |
| Modals, sheets, drawers | 20-24px |

### Shadows & Depth
Very subtle shadows to create layered depth without heaviness.

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.08);
--shadow-elevated: 0 12px 40px rgba(0, 0, 0, 0.10);
```

### Glassmorphic Elements
Used sparingly on headers, sidebars, and floating panels only.

```css
.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
```

Readability must always remain high. Never sacrifice legibility for visual effect.

### Motion & Transitions
Subtle and polished. Quick fades and slight scale/slide transitions. No bouncy or playful effects.

| Transition | Duration | Easing |
|-----------|----------|--------|
| Hover states | 150ms | ease-out |
| Modals / sheets | 200ms | ease-in-out |
| Page transitions | 250ms | ease-in-out |
| Micro-interactions | 150ms | ease-out |

Scale transitions should be minimal (0.98 to 1.0 range). Slide transitions should be short (8-12px travel). Opacity transitions from 0 to 1.

### Buttons & Inputs
Simple, rounded, and refined.

**Buttons:**
- Soft fill backgrounds (no harsh solid colors)
- Light borders where appropriate
- Clear, concise labels
- Elegant focus states (soft ring, not browser default)
- Primary: accent fill with white text
- Secondary: transparent with border
- Ghost: no background, text only

**Inputs:**
- Light gray background (#F5F5F7) or white with thin border
- Generous padding (12-16px)
- Subtle focus ring (accent color at low opacity)
- Floating or inset labels

### Icons
Simple and consistent, SF Symbols-like style. Match the stroke weight and visual weight of the typography. Use a consistent icon set (Lucide recommended for React, closest to SF Symbols aesthetic).

### Layout Principles
- Spacious with strict alignment
- Generous padding (24-32px on containers, 16-20px on cards)
- Plenty of whitespace between sections
- Content width max 1200px, centered
- Grid-based alignment (8px grid system)
- Mobile-first responsive breakpoints

### Component Styling (shadcn/ui Overrides)
All shadcn components will be restyled to match this design system. Key overrides:
- Increase border-radius to match our scale
- Swap color tokens to our neutral palette
- Adjust padding and spacing for more generous feel
- Replace default shadows with our subtle variants
- Update font stack and sizes
- Soften focus/active states

### Design Principles
- **Clarity over decoration** (every element earns its place)
- **Progressive disclosure** (don't overwhelm new users)
- **Speed as a feature** (every interaction feels instant)
- **Data-driven decisions** (surface analytics everywhere)
- **Zero-config smart defaults** (works great out of the box, customizable for power users)
- **Mobile-first responsive** design

---

## 8. Success Metrics

- **Activation:** 80%+ of registered participants complete onboarding profile
- **Engagement:** Average participant views 10+ match recommendations per event
- **Conversion:** 30%+ of match recommendations lead to meeting requests
- **Satisfaction:** 4.0+ average meeting rating
- **Retention:** 60%+ of organizers run a second event on the platform
- **NPS:** 50+ from event organizers

---

## 9. Phased Delivery

| Phase | Scope | Priority |
|-------|-------|----------|
| Phase 1 | Auth, Events, Profiles, AI Matching, Scheduling, Messaging | P0 (MVP) |
| Phase 2 | Agenda, Website Builder, Analytics, Sponsor Tools | P1 |
| Phase 3 | Check-in, Networking+, Post-Event, Integrations, Mobile | P2 |
| Phase 4 | Multi-tenant, Monetization, Admin Panel | P3 |

---

## 10. Infrastructure

| Service | Details |
|---------|---------|
| GitHub | JarvisSterling/b2pair |
| Vercel | prj_lZUy8DhjCCrIFtVkbQyoCtLRvhf1 (b2pair) |
| Supabase | eemeremqmqsqsxioycka (eu-central-1) |
| Supabase URL | https://eemeremqmqsqsxioycka.supabase.co |
| DB Password | B2PairDB2026!Secure |

---

*This is a living document. It will be updated as decisions are made and features are refined.*
