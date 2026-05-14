# Egg Drop Console Tech Stack

This document defines the phase-wise stack for building the Egg Drop Console with a self-hosted Supabase instance and a dedicated Postgres schema for game data.

## Core Direction

Build one responsive web application with role-based routes for Admin, Judge, Team, and Projector views. Use self-hosted Supabase for database, auth, storage, row-level security, and realtime broadcasts. Keep deterministic game rules in server-side APIs so scoring, stock, budgets, and phase transitions cannot be manipulated from the browser.

## Recommended Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Web app | Next.js App Router + TypeScript | One codebase for admin, judge, team, and projector consoles |
| UI | Tailwind CSS + shadcn/ui + lucide-react | Fast, responsive, consistent console UI |
| Forms | React Hook Form + Zod | Reliable admin setup, scoring, catalog, and rule validation |
| Data client | `@supabase/supabase-js` | Direct integration with self-hosted Supabase |
| Database | Self-hosted Supabase Postgres | Durable event, team, purchase, score, and analytics data |
| DB schema | Dedicated schema, e.g. `eggdrop` | Keeps game tables isolated from other Supabase data |
| Auth | Supabase Auth | Admin and judge email auth, team join codes mapped to sessions |
| Realtime | Supabase Realtime channels + Postgres changes | Live timer, stock, spend, submissions, scores, leaderboard |
| Server logic | Next.js Route Handlers / Server Actions | Trusted mutations for purchases, scoring, phase changes |
| Storage | Supabase Storage | Optional team photos, resource images, event branding |
| Deployment | Dockerized Next.js + self-hosted Supabase | Fits a self-hosted setup and can run on VPS/Coolify |
| Observability | Supabase logs + Sentry + structured app logs | Debug live event issues quickly |

## Phase 0: Foundation and Environment

Goal: Establish the app, Supabase project conventions, and local development workflow.

| Area | Stack / Tooling |
|---|---|
| Runtime | Node.js LTS |
| Package manager | pnpm or npm |
| Framework | Next.js with App Router |
| Language | TypeScript strict mode |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Icons | lucide-react |
| Code quality | ESLint, Prettier, TypeScript checks |
| Environment | `.env.local` for app URL, Supabase URL, anon key, service role key |

Required outputs:
- Next.js app scaffold.
- Supabase client helpers for browser, server, and admin/service-role usage.
- Environment variable contract documented.
- Base route groups for `/admin`, `/team`, `/judge`, and `/projector`.

## Phase 1: Supabase Schema and Data Model

Goal: Create the dedicated game schema and durable tables.

Use a new schema:

```sql
create schema if not exists eggdrop;
```

Recommended tables:

| Table | Purpose |
|---|---|
| `eggdrop.events` | Event metadata, venue, date, drop height, phase, timer settings |
| `eggdrop.event_settings` | Optional rules, twist toggles, scoring config |
| `eggdrop.teams` | Team name, color, budget, current status, join code |
| `eggdrop.team_members` | Participant names, role, team assignment |
| `eggdrop.collaborators` | Admins, judges, facilitators, permissions |
| `eggdrop.resources` | Marketplace catalog items, category, price, stock, image |
| `eggdrop.inventory_transactions` | Purchases, refunds, trades, stock adjustments |
| `eggdrop.team_wallets` | Budget, spent amount, remaining credits snapshot |
| `eggdrop.submissions` | Digital submission state and judge received state |
| `eggdrop.drop_tests` | Drop order, drop result, judge notes |
| `eggdrop.scores` | Egg, shield, innovation, budget, bonus, penalty, total |
| `eggdrop.twists` | Scheduled or triggered game twists |
| `eggdrop.audit_log` | Important admin, judge, purchase, and scoring actions |

Schema requirements:
- Put all game tables under `eggdrop`.
- Use UUID primary keys.
- Add `event_id` to every event-owned table.
- Add `created_at` and `updated_at` timestamps.
- Add database constraints for non-negative budgets, prices, stock, and scores.
- Use database transactions or RPC functions for stock-sensitive operations.

Important Supabase configuration:
- Expose the `eggdrop` schema through the Supabase API settings.
- Add `eggdrop` to realtime publication only for tables that need live updates.
- Keep service-role mutations server-side only.

## Phase 2: Auth, Roles, and Access Control

Goal: Ensure every user sees and changes only what their role permits.

| User Type | Access Pattern |
|---|---|
| Admin | Supabase Auth email magic link or password login |
| Judge | Supabase Auth invite or collaborator record |
| Team Captain | Join code plus team session, optionally captain PIN |
| Team Member | Join code read/write access scoped to team |
| Projector | Read-only signed route or public event display token |

Implementation stack:
- Supabase Auth for admin and judge identities.
- `eggdrop.collaborators` table for event-level role mapping.
- Join-code flow for team access.
- Middleware for route protection.
- Row-level security policies scoped by event and role.

RLS direction:
- Admin can manage events they own.
- Judge can read event data and write submission/drop/score records.
- Teams can read event marketplace data and write only their own cart/purchases/submission.
- Projector can read only display-safe event, leaderboard, stock, and phase data.

## Phase 3: Admin Setup Console

Goal: Build the event management workflow.

Frontend stack:
- Next.js server components for initial event loading.
- Client components for editable setup modules.
- React Hook Form + Zod for validation.
- shadcn/ui tables, dialogs, tabs, forms, and toasts.

Admin modules:
- Event setup.
- Teams manager.
- Members manager.
- Resource catalog.
- Budget allocator.
- Timer and phase configuration.
- Judge/collaborator invite.
- Twists and optional rules.
- Projector preview.
- Go Live action.

Backend requirements:
- Server-side validation for all setup writes.
- Phase lock before Go Live.
- Audit log for setup changes.
- Admin-only server actions or route handlers.

## Phase 4: Game Engine and Phase State Machine

Goal: Centralize phase transitions and game rules.

Recommended implementation:
- Store current event phase in `eggdrop.events.phase`.
- Keep all phase transitions in trusted server APIs.
- Use a typed state machine in application code.
- Persist major transitions to `eggdrop.audit_log`.

Required phases:
- `setup`
- `budget_offer`
- `build`
- `trading`
- `submission`
- `drop_test`
- `scoring`
- `final`
- `aborted`

Rule engine responsibilities:
- Start budget acceptance window.
- Start build timer when all teams accept or the window expires.
- Open and close trading window when enabled.
- Freeze purchases after build ends.
- Mark late or missing submissions.
- Randomize drop order.
- Close event after final scoring.

## Phase 5: Realtime Timer, Marketplace, and Team Console

Goal: Build the live team experience.

Frontend stack:
- Client components for marketplace, wallet, timer, cart, and submit actions.
- Supabase Realtime subscriptions for phase, stock, purchases, wallet, and timer events.
- Optimistic UI only after server-confirmed stock reservation, not before.

Critical backend operations:
- `purchase_resource`
- `refund_resource`
- `trade_resource`
- `accept_budget`
- `submit_project`

These should be implemented as transactional server operations or Postgres RPC functions because stock and budget must be consistent under concurrent team purchases.

Realtime channels:
- `event:{event_id}:phase`
- `event:{event_id}:marketplace`
- `event:{event_id}:leaderboard`
- `team:{team_id}:wallet`
- `team:{team_id}:submission`

## Phase 6: Judge Console and Scoring

Goal: Give the judge a fast, reliable scoring workflow.

Frontend stack:
- Step-based scoring form.
- Keyboard-friendly controls for live event use.
- Score preview before submission.
- Current team and next team queue.

Backend requirements:
- Server-side score calculation.
- One score per team per event unless admin unlocks correction.
- Immutable scoring audit log.
- Penalty and bonus handling.
- Tie-break ordering.

Tables used:
- `eggdrop.submissions`
- `eggdrop.drop_tests`
- `eggdrop.scores`
- `eggdrop.audit_log`

## Phase 7: Projector and Live Leaderboard

Goal: Build a stable read-only public display.

Frontend stack:
- Dedicated route: `/projector/[eventId]` or `/p/[displayToken]`.
- Large typography, high contrast, no controls.
- Realtime subscriptions for phase, timer, purchases, stock alerts, current team, and leaderboard.

Data rules:
- Projector should never expose private emails, auth metadata, internal IDs, or admin-only controls.
- Use a display token or read-only event projection view.

Recommended database views:
- `eggdrop.projector_events`
- `eggdrop.projector_leaderboard`
- `eggdrop.projector_market_activity`

## Phase 8: Analytics and Debrief

Goal: Turn the game into measurable L&D output.

Analytics data:
- Spend over time.
- Purchase timing.
- Refunds and trades.
- Resource scarcity moments.
- Submission time.
- Score breakdown.
- Penalties and bonuses.
- Final rank and tie-break reasons.

Stack:
- SQL views or materialized views for analytics.
- Recharts or Tremor for charts.
- CSV export from server route.
- Optional PDF export using a server-side renderer later.

Recommended views:
- `eggdrop.team_spend_timeline`
- `eggdrop.final_leaderboard`
- `eggdrop.team_debrief_summary`

## Phase 9: Deployment and Operations

Goal: Run the app reliably during live corporate events.

Infrastructure:
- Self-hosted Supabase.
- Dockerized Next.js app.
- Reverse proxy with HTTPS.
- Separate staging and production environments.
- Automated database migrations.

Operational requirements:
- Daily Postgres backups.
- Pre-event smoke test.
- Admin-only event reset controls.
- Error tracking with Sentry.
- App health endpoint.
- Supabase connection pooler if traffic grows.

Deployment checklist:
- Supabase URL reachable from the app server.
- `eggdrop` schema exposed in Supabase API settings.
- Realtime enabled for required tables.
- RLS policies tested per role.
- Service role key available only on the server.
- Projector route tested on venue network.

## Phase 10: Testing Strategy

Goal: Prevent live-event failures.

| Test Type | Stack | Coverage |
|---|---|---|
| Unit tests | Vitest | Score calculation, tie-breaks, phase transitions |
| Component tests | React Testing Library | Forms, marketplace, scoring controls |
| E2E tests | Playwright | Admin setup, team purchase, judge scoring, projector update |
| Database tests | Supabase CLI / SQL tests | RLS, constraints, RPC transaction behavior |
| Load checks | k6 or simple scripted clients | Concurrent marketplace purchases and realtime fanout |

Must-test scenarios:
- Two teams try to buy the final stock item at the same time.
- Team tries to overspend.
- Team submits after timer expiry.
- Judge edits or resubmits a score.
- Projector refreshes mid-game.
- Event resumes after browser disconnect.

## Suggested Build Order

1. Supabase schema, migrations, RLS skeleton.
2. Next.js app shell and route protection.
3. Admin setup workflow.
4. Event phase state machine.
5. Team join, budget acceptance, marketplace, wallet.
6. Realtime phase, stock, timer, and leaderboard updates.
7. Judge submission and scoring console.
8. Projector route.
9. Debrief analytics.
10. Deployment hardening and event smoke tests.

## Initial Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
EGGDROP_DB_SCHEMA=eggdrop
PROJECTOR_TOKEN_SECRET=
```

## Notes for Self-Hosted Supabase

- Confirm the custom schema is included in Supabase API exposed schemas.
- Use `Content-Profile: eggdrop` and `Accept-Profile: eggdrop` headers if querying the custom schema directly through PostgREST.
- Prefer server-side operations for anything that changes stock, budget, phase, or score.
- Keep realtime publication narrow; broadcasting every table will create unnecessary noise.
- Back up the database before each live event.
