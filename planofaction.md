# Egg Drop Console — Plan of Action

A phased plan to take the app from "auth + setup + team join works" to a production-grade game console matching the spec in `eggdrop.md`.

Each phase is sized to be **independently shippable**. Don't start phase N+1 until phase N is demoable end-to-end.

---

## Phase 0 — Where we are today (baseline)

Working:

- Supabase schema (`schema.sql`) deployed; `eggdrop.*` tables exist, realtime publication configured.
- Google Apps Script email relay (`src/lib/email-service.ts`) sending judge invites, password resets, team join codes.
- Admin auth (Supabase Auth) + password reset flow.
- Admin event setup: `/admin/setup` writes to `eggdrop.events` and seeds default resources.
- Admin teams manager: `/admin/teams` creates teams + `team_wallets` and emails the captain a direct join link with `?code=` prefilled.
- Team join flow: `/team/join?code=…` validates code (admin client, schema-safe), sets `team_session` httpOnly cookie, redirects to `/team`.
- Team console: `/team` reads the cookie server-side, shows real team / wallet / resources, has a working purchase server action gated on phase = `build` / `trading`.

Known gaps (handled in phases below):

- `/admin` dashboard still hardcodes `eventId = 'active-event-id'` and shows fake stats.
- No phase transition wiring beyond `setup` (Launch Event button is a stub).
- No master timer wiring — `timer_ends_at` is never written.
- No budget-offer acceptance UI for captains.
- No submission flow.
- Judge console (`/judge`) and projector (`/projector`) are scaffolds only.
- No drop test runner, no scoring rubric, no leaderboard.
- No twists, no bonuses, no penalties.
- No RLS on `eggdrop.*` — every read goes through the service role; the schema is not exposed to anon.
- No realtime in any client; pages refresh via `router.refresh()`.
- No CI, no error monitoring, no analytics, no audit log writes.

---

## Phase 1 — Game loop MVP (admin → captain → judge → leaderboard)

**Goal:** A full event can be run end-to-end with one admin and one judge on a laptop. Real teams join, build, submit, get scored, see a leaderboard. No fancy realtime, no twists. **This is the must-ship-for-pilot phase.**

### 1.1 Admin dashboard wired to current event
- Replace hardcoded `eventId = 'active-event-id'` in `src/app/(admin)/admin/page.tsx` with `await getCurrentEvent()`.
- Real stats: count `eggdrop.teams`, `eggdrop.resources`, count `collaborators where role = 'judge'`, current `event.current_phase`.
- "Launch Event" calls `transitionEventPhase(event.id, 'budget_offer')`.
- Add a small "Current Phase" pill on the dashboard.

### 1.2 Phase state machine in `game-engine.ts`
- Implement `transitionEventPhase(eventId, nextPhase)` with guard rails (e.g., can't jump from `setup` to `final`).
- Implement `startBuildPhase(eventId)` — sets `current_phase = 'build'`, writes `timer_started_at = now()` and `timer_ends_at = now() + interval(timer_duration_minutes)`.
- Implement `endBuildPhase(eventId)` — sets `current_phase = 'submission'`.
- All transitions write to `eggdrop.audit_log`.

### 1.3 Budget offer + acceptance
- When admin clicks Launch Event → `current_phase = 'budget_offer'`. On `/team` show a full-screen "Your budget is N CR" card with **Accept** button.
- `acceptBudgetAction()` server action sets `teams.budget_accepted_at = now()`.
- After acceptance, transition rule: when **all** teams for the event have `budget_accepted_at IS NOT NULL`, auto-call `startBuildPhase(eventId)`. (Implement as a SQL function or a polling check inside `acceptBudgetAction`.)
- Optional: 2-min timeout on budget acceptance per spec R8 — defer to phase 3.

### 1.4 Timer rendering
- `RealtimeTimer` already exists. Verify it ticks down from `event.timer_ends_at` correctly across all three consoles.
- Add 50% / 25% / 10% / 1 min visual warnings (color shift, no sound yet).

### 1.5 Submission flow
- On `/team` during build/trading: replace "Purchase" focus with a sticky **Submit Project** button at the bottom.
- `submitProjectAction()` inserts into `eggdrop.submissions` with `status='pending'`, freezes the team (`teams.status` stays `active` but no more purchases).
- When timer hits zero, server-side cron / on-demand sweep marks teams without a submission row as `disqualified`.

### 1.6 Admin "transition to submission" + "transition to drop_test" buttons
- On `/admin` after Launch: show buttons matching the current phase (`Start Drop Tests`, `Crown Winners`, etc.).
- Manual transitions for the pilot; automation comes in phase 2.

### 1.7 Judge console — submissions inbox + drop runner
- `/judge` (already scaffolded) lists submissions: team name, color, submitted-at timestamp, status pill.
- "Mark Received" button per row → updates `submissions.status='received'`, `judge_confirmed_at = now()`.
- "Run Drop Test" button per team → opens the drop test runner UI:
  - Egg integrity radio (40/25/10/0)
  - Shield integrity radio (20/15/10/5/0)
  - Innovation slider (0–20)
  - Notes textarea
  - Submit → writes `eggdrop.drop_tests` and `eggdrop.scores` (with budget efficiency auto-computed from wallet).

### 1.8 Scoring service
- Server action `recordDropTestAndScore(teamId, rubric)` does:
  - Insert `drop_tests` row
  - Compute `budget_efficiency_score = (1 - spent/budget) * 20`
  - Upsert `scores` row
- The `scores.total_score` generated column does the math.

### 1.9 Leaderboard
- New `/admin/leaderboard` and `/projector/leaderboard` routes.
- Server-render the `scores` table joined with `teams`, ordered by `total_score desc`.
- Apply tie-breakers per §10 of `eggdrop.md` (egg → budget → innovation).
- Auto-refresh every 5s via `router.refresh()` polling for now.

### 1.10 Definition of done for Phase 1
- A facilitator can: create event → add resources → create 2+ teams (with captain emails) → captains receive emails → click join link → see budget offer → accept → buy from marketplace → submit → judge marks received → judge runs drop tests → leaderboard shows winners.
- No console errors. No "Team Eagles" or "active-event-id" leftovers.
- Manual phase transitions are fine; no automation required.

---

## Phase 2 — Realtime + projector

**Goal:** All clients (admin, team, judge, projector) reflect state changes within ~1 second without manual refresh.

### 2.1 Decide: Supabase Realtime vs. SSE/WebSocket

Two options:

- **Option A — Supabase Realtime (recommended).** Already configured in `schema.sql` via `alter publication supabase_realtime add table eggdrop.*`. Requires exposing the `eggdrop` schema to the anon role and adding RLS so anon (or a team-cookie-derived role) can subscribe to the right rows.
- **Option B — Custom SSE route in Next.js.** Avoids RLS work but loses Supabase's diffing; need to broadcast manually from each server action.

Go with Option A. Trade-off: ~1 day of RLS policy authoring.

### 2.2 Expose schema + write RLS
- Add `eggdrop` to Supabase API exposed schemas (dashboard or `db.schemas` in config).
- `grant usage on schema eggdrop to anon, authenticated;`
- `grant select on eggdrop.events, eggdrop.teams, eggdrop.resources, eggdrop.team_wallets, eggdrop.submissions, eggdrop.scores to anon;` (only the tables actually subscribed to).
- RLS policies (write into `schema.sql`):
  - `events` — anyone can `select` (event metadata is not sensitive).
  - `teams` — anyone can `select`. (Join code is sensitive but already issued.)
  - `resources` — anyone can `select`.
  - `team_wallets` — anyone can `select` (totals are projector content).
  - `submissions`, `scores` — anyone can `select`.
- **All writes stay on the service role / server actions.** No anon write policies.

### 2.3 Re-enable client hooks
- The `useEvent`, `useWallet`, `useResources` hooks already exist (`src/hooks/use-*.ts`) and subscribe via Realtime. They are currently bypassed since `/team` is RSC. Hybrid pattern: server-render initial data, hydrate client component, then subscribe via these hooks for updates.

### 2.4 Projector view
- Build `/projector/[eventId]` (or `/p/[eventId]` per spec §15) as a public, read-only, TV-typography page.
- Sections per ASCII wireframe in §13.1:
  - Live leaderboard (top of card).
  - Marketplace activity (last 10 `inventory_transactions`, polled or subscribed).
  - Team spend bars.
  - Stock alerts (resources with `stock_remaining < 3`).
- Token-gated by `PROJECTOR_TOKEN_SECRET` (env var already exists in `.env.local`) so a random URL guess can't read it. URL shape: `/projector/EVENT_ID?token=…`.

### 2.5 Definition of done
- Captain buys an item → admin dashboard, projector, and the captain's own marketplace card all update without refresh.
- Judge enters a score → leaderboard on projector updates within a second.
- No "websocket disconnected" toasts during a 30-minute session.

---

## Phase 3 — Twists, bonuses, penalties, edge cases

**Goal:** Match the full ruleset in `eggdrop.md` §6, §8.5, §11.

### 3.1 Bonuses (§8.5)
- Auto-compute submission-time bonus from `submissions.submitted_at` vs. `events.timer_started_at`/`timer_ends_at` in the scoring step.
- Add judge-controlled "Presentation" and "Aesthetic" bonus inputs to the drop-test rubric form.

### 3.2 Penalties (§11)
- Late submission detection (within 30s of buzzer): −10 pts. Beyond 30s: disqualify.
- Over-budget guard already enforced at purchase time; add a final check at submit time.
- Build size violation: judge-flagged manual penalty button on the drop runner.

### 3.3 Refunds + trading
- Build phase first half only: refund button on the team console, refunds at 50% of price. Implement as inverse `inventory_transactions` row + wallet credit.
- Trading window (R13): admin toggles `event_settings.trading_window_enabled`; system auto-flips `current_phase='trading'` at the 50% timer mark; teams can initiate peer trades from a "Trade" tab. (Out of scope for Phase 3 unless explicitly requested — flag and revisit.)

### 3.4 Twists (§11 optional, admin-triggered)
- New `/admin/twists` page lists the 5 admin-triggerable twists.
- Each twist click writes a row to `eggdrop.twists`, applies its side effects (e.g., Market Crash → `update resources set price_credits = price_credits * 0.7`), and broadcasts via realtime.
- Twist effects must be reversible on undo (store before-state in the twist row's payload).

### 3.5 Disqualification + admin override
- Surface DQ state on team console with a banner.
- Admin can manually DQ / un-DQ via `/admin/teams`.

### 3.6 Definition of done
- A facilitator can run a 30-minute event with the optional Mystery Resource and Market Crash twists active, and the leaderboard reflects bonuses + penalties correctly.

---

## Phase 4 — Auth, security, multi-event

**Goal:** Safe to expose at a real URL without manual hand-holding.

### 4.1 RLS audit
- Re-audit every policy added in 2.2. Verify:
  - No anon row can be inserted/updated/deleted via the public API.
  - No team can read another team's `inventory_transactions` (RLS by `team_session.teamId` from JWT, or move all reads to server actions).
- Add `policy violation` test: run a `SELECT` from anon against `eggdrop.audit_log` — must fail.

### 4.2 Judge auth
- Right now judges receive an invitation email with a link to `/judge`. Confirm whether `/judge` is auth-gated (read `src/app/(judge)/judge/page.tsx`).
- Option A: send judge a magic link to Supabase Auth; check `collaborators.role='judge'` in middleware. (Recommended.)
- Option B: token in URL like projector. Lower security but simpler.
- Decide and implement.

### 4.3 Team session hardening
- The `team_session` cookie currently contains `{teamId, eventId, teamName}` as plain JSON. Anyone who can read the cookie value (e.g., a malicious browser extension) can spoof another team.
- Replace with a signed JWT (HS256, key in `SUPABASE_SERVICE_ROLE_KEY`-equivalent env var). Validate signature in `readTeamSession`.

### 4.4 Multi-event isolation
- Today `getCurrentEvent()` returns the most-recently-created event. Future events would clobber the current one in admin views.
- Either:
  - Single-active-event model: add `events.is_active boolean`, only one active at a time. (Simpler.)
  - Multi-event model: admin picks "current event" from a dropdown that sets a cookie. (Heavier.)
- Single-active-event is enough for the pilot.

### 4.5 Secrets + env
- Rotate `PROJECTOR_TOKEN_SECRET` (currently `change-me-later-12345`).
- Move the Google Apps Script URL to an env var instead of hardcoded in `src/lib/email-service.ts`.
- Document required env vars in `README.md`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `EGGDROP_DB_SCHEMA`
  - `PROJECTOR_TOKEN_SECRET`
  - `EMAIL_RELAY_URL`
  - `TEAM_SESSION_SECRET`

### 4.6 Rate limiting
- Add rate limit on the join-code endpoint (e.g., 10 attempts/min/IP) to prevent code brute-force. Code space is 32^6 ≈ 1B but still want a guard.
- Vercel Edge Middleware + `@upstash/ratelimit`, or roll a small in-memory limiter for the pilot.

### 4.7 Definition of done
- Pen-test checklist: cannot impersonate another team via cookie tinkering; cannot read other event's data; cannot brute-force a join code; service role key never reaches the browser.

---

## Phase 5 — Operations + production readiness

**Goal:** A facilitator running the app at 3 PM on event day doesn't need an engineer on standby.

### 5.1 Error monitoring
- Add Sentry (or equivalent) to `src/app/layout.tsx`. Capture client errors, server action errors, and unhandled promise rejections.
- Wire toast errors to also report to Sentry with breadcrumb (event id, team id, phase).

### 5.2 Audit log writes
- The `eggdrop.audit_log` table exists but nothing writes to it. Add `auditLog(eventId, actorId, action, details)` helper and call it in every server action:
  - `saveEvent`, `createTeam`, `inviteJudge`, phase transitions, purchases, refunds, submissions, drop scores, twist triggers, DQs.
- Surface a `/admin/audit` log viewer (Phase 6).

### 5.3 CI
- GitHub Actions workflow on PR + push to master:
  - `npm ci`
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build` (catches Next.js prerender issues like the `useSearchParams` Suspense one we hit).
- Required check before merge.

### 5.4 Deploy
- Vercel project already exists (`eggdrop-ebon.vercel.app`).
- Add a staging deploy that points at a separate Supabase project or a `staging` schema, so pre-pilot tests don't poison live data.
- Document the deploy steps in `README.md`.

### 5.5 Backups + recovery
- Confirm Supabase nightly snapshots are enabled.
- Document the "oh no I deleted the event" recovery path (point-in-time restore from Supabase dashboard).

### 5.6 Pre-event runbook
- A `RUNBOOK.md` covering:
  - 24h before: create event, add resources, dry-run with 2 dummy teams.
  - 1h before: verify projector reachable, verify judge can log in.
  - During: phase transition order, who clicks what, recovery if a captain's browser crashes mid-game.
  - After: export scores, send debrief emails.

### 5.7 Definition of done
- A non-engineer can run an event by following the runbook. Any error during the event surfaces in Sentry within 30 seconds.

---

## Phase 6 — Polish, analytics, debrief

**Goal:** The thing L&D actually pays for — defensible learning outcomes per §14.

### 6.1 Post-game debrief screen
- New `/admin/events/[id]/debrief` route, also exportable as PDF.
- Per team:
  - Spend curve over time (timestamped from `inventory_transactions`).
  - Decision points (annotated purchases of high-cost or wildcard items).
  - Trades made (when Phase 3.3 trading lands).
  - Final score breakdown (the four pillars + bonuses + penalties).
- Aggregate:
  - Team rankings.
  - Time-to-first-purchase per team (proxy for decision speed).
  - Budget utilization curve across teams.

### 6.2 Analytics export
- CSV export of `inventory_transactions`, `submissions`, `drop_tests`, `scores`, `audit_log` filtered by event.

### 6.3 Audit log viewer
- `/admin/audit` filtered by event, actor, action.

### 6.4 Email follow-up
- Auto-send participants a "thanks + your results" email via the Apps Script relay one hour after `current_phase = final`.
- Send admins a debrief link.

### 6.5 Mobile polish
- Audit `/team` on a 360px-wide screen; the marketplace card grid should collapse cleanly (it already does, but verify with real device + portrait orientation).
- Submission CTA must be reachable without scroll on the smallest target devices.

### 6.6 Accessibility pass
- Axe-core audit on each console route.
- Color contrast: the green/amber/red leaderboard pills must be readable for colorblind users — pair color with an icon.

### 6.7 Definition of done
- Post-event, the facilitator clicks one link and gets a PDF debrief they can send to their L&D head.

---

## Sequencing summary

| Phase | What you unlock | Rough effort |
|---|---|---|
| 0 (done) | Setup, teams, join | — |
| **1** | **Full game loop, manual transitions** | **3–5 days** |
| 2 | Realtime + projector | 2–3 days |
| 3 | Twists, bonuses, penalties | 2–3 days |
| 4 | Auth & security hardening | 2 days |
| 5 | Ops + monitoring + runbook | 1–2 days |
| 6 | Debrief + analytics + polish | 2–3 days |

**Minimum-viable-pilot:** Phases 1 + 2 + a slim version of 4 (just signed cookies + rate limit). That gets you to a real event with real participants. Everything beyond is iteration.

---

## What I'm NOT planning here

Out of scope for this plan — call them out before they sneak in:

- Native mobile apps (responsive web only).
- Multi-tenant SaaS (each company gets their own Supabase project for now; if multi-tenancy is needed it's a separate quarter of work).
- AI features (auto-judging via camera, etc.) — neat, not needed.
- Internationalization. English only.
- Payments / billing.
