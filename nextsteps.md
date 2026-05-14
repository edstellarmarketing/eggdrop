# Egg Drop Console — Next Steps (Session Handoff)

This file picks up where the current session ends. A fresh AI session or new
engineer should be able to read this and continue building without re-deriving
context. Pair with `eggdrop.md` (game spec) and `planofaction.md` (long-range
phased plan).

---

## TL;DR — what's done and what's next

**Working today:**
- Admin auth + sign-out + Collaborator role tab on `/login`.
- Event CRUD (create / edit / delete with cascade).
- Teams CRUD with a **2-step wizard** — step 1 collects team basics + member
  count, step 2 collects each member's name / designation / email / photo
  (Supabase Storage `avatars` bucket, auto-created on first upload) and lets
  the admin tag one as captain. Captain's email auto-receives the join code.
- Participants CRUD on a dedicated team page (same fields + avatars).
- Resources CRUD (catalog scoped per event, prices + stock).
- Team join via `/team/join?code=…` (auto-fills and submits).
- Team console at `/team` (server-rendered, reads `team_session` cookie,
  marketplace gated on `phase ∈ {build, trading}`).

**Up next, in order:** Start gate → captain budget acceptance → live game view
(admin opens it and screen-shares to the venue) → submission/drop-test/scoring.

See *§ Build phases* below for the file-by-file plan.

---

## Project ground rules

1. **`'use server'` files can ONLY export async functions.** Put constants and
   types in `src/lib/*` (see `src/lib/resources.ts`, `src/lib/participants.ts`).
   Hitting this again would silently break a route with a 500.
2. **All Supabase reads/writes for `eggdrop.*` use `createAdminClient()` server-side.**
   The schema is not exposed to the `anon` role yet. Client-side hooks that
   query `eggdrop.*` directly will return empty. Realtime is deferred (Phase 2
   of `planofaction.md`).
3. **Next.js 16 with Turbopack.** Read `node_modules/next/dist/docs/` for any
   API you're unsure about — defaults have shifted from older versions
   (`useSearchParams` needs `<Suspense>`, server actions accept FormData, etc.).
4. **`next/image` with external Supabase URLs:** pass `unoptimized` to bypass
   whitelisting in `next.config.ts`. Already used in
   `participants-manager.tsx` and `teams-manager.tsx`.
5. **Don't push small commits.** Bundle work, push when a feature is complete.
   User explicitly asked for this. Local dev server runs on `:3000`.
6. **Self-hosted Supabase at `supabasekong-…sslip.io`.** Service-role key in
   `.env.local` is correct. Anon key was rotated mid-session (the original had
   a typo `role: "inon"` instead of `anon`). If you see 401s on `auth.getUser()`,
   suspect the anon key has the same problem again.
7. **The `team_session` cookie** is plain JSON (`{teamId, eventId, teamName}`),
   `httpOnly`. Sign it (JWT) before production — flagged in Phase 4 of the
   plan-of-action.

---

## Key decisions locked in

| Decision | Choice | Why |
|---|---|---|
| Start flow | **Option B** — Start → `budget_offer` → captains accept → auto-advance to `build` with timer | Matches `eggdrop.md` §6.2 ritual. Per-team accept lighting up green on the projector is part of the show. |
| Projector access | **No separate projector route.** Admin opens the live view inside `/admin/...` and screen-shares it (HDMI / Chromecast / browser share) to the venue display. No public URL, no token. | User confirmed: "projector is not actually a separate setup, admin will simply share the game screen page from his laptop". `PROJECTOR_TOKEN_SECRET` env var no longer needed for this. |
| Live updates | **Polling every 3s** via `router.refresh()` on the client | Skips RLS work. Move to Supabase Realtime in Phase 2 of plan-of-action. |
| Start button location | Pinned to the **event header** in `events/[id]/layout.tsx`, visible from all tabs | Always reachable. Once event is past `setup`, replaces it with **Open live view** button. |
| Controls vs. clean spectator view on the live page | Single page with a togglable controls panel. Default: controls visible to admin. Press **H** or click **Hide controls** to collapse into a small floating button; press again to expand. When the admin shares the screen, they hide controls so spectators see a clean board. | Avoids splitting into two routes; admin doesn't have to switch tabs to advance a phase. |
| Captain accept UX | Full-screen card on `/team` when `phase='budget_offer'` showing budget and an Accept button. Captains *and* members see "waiting on captain" message if they're not the captain. | Single dedicated moment, clear. |
| Projector card content | Captain's photo + name with crown; member avatar strip with names underneath; phase-aware status pill; budget bar; last 3 purchases | Per-spec §13.1, adapted for our data model. |

---

## Database state

Already applied:
```sql
alter table eggdrop.team_members add column if not exists designation text;
alter table eggdrop.team_members add column if not exists email text;
alter table eggdrop.team_members add column if not exists avatar_url text;
```

Schema otherwise per `schema.sql`. Storage bucket `avatars` is created lazily on
first upload by `uploadAvatarAction` (`src/app/actions/uploads.ts`). It's
public-read with `image/png|jpeg|webp|gif` mime allowlist, 5 MB size limit.

`PROJECTOR_TOKEN_SECRET` is set in `.env.local` (currently `change-me-later-12345`).
Rotate before any external use.

No more migrations required for the next phases.

---

## Current routing map

```
/                                              → redirect to /login
/login                                         Admin/Collaborator tabs (no magic link)
/forgot-password                               Supabase password reset
/auth/callback                                 OAuth/email callback
/auth/update-password                          set new password after reset

/admin                                         events list
/admin/events/new                              create event form
/admin/events/[id]                             event Overview (tab: Overview)
/admin/events/[id]/teams                       Teams tab (list + wizard)
/admin/events/[id]/teams/[teamId]              Participants for a team
/admin/events/[id]/resources                   Resources tab

/admin/setup, /admin/teams, /admin/resources   redirects to /admin (legacy)

/team/join                                     enter join code (auto-fills from ?code=)
/team                                          team console (server-rendered)

/judge                                         (scaffold only, not wired)
```

The live game view lives at `/admin/events/[id]/live` only. Admin signs in,
opens that route, and screen-shares (HDMI / Chromecast / browser share) to the
venue display. There is no separate public projector route.

The existing `/projector` scaffold can be deleted when convenient (low-priority
cleanup).

---

## Build phases

### Phase A — Start gate + transition (next up)

**Goal:** Admin clicks **Start event** on the event header. Phase transitions
`setup → budget_offer`. Button is gated on readiness.

Files to create / modify:

- `src/app/actions/events.ts` — add `getStartReadiness(eventId)`:
  ```ts
  interface StartReadiness {
    ready: boolean
    blockers: string[]   // ['Add at least 2 teams', 'Team A has no captain', ...]
    teamCount: number
    resourceCount: number
    teamsWithoutCaptain: string[]
  }
  ```
  Counts teams/resources, joins `team_members` for captain presence.

- `src/app/(admin)/admin/events/[id]/layout.tsx` — server-render the readiness
  + current phase, pass into a new `EventHeaderControls` client component.

- `src/app/(admin)/admin/events/[id]/event-header-controls.tsx` (new) —
  client component. Renders one of:
  - Phase = `setup` → **Start event** button (disabled with tooltip if not ready).
    Calls `transitionEventPhase(eventId, 'budget_offer')`.
  - Phase ≠ `setup` → **Open live view** button (links to
    `/admin/events/[id]/live` — admin opens this then screen-shares to the
    venue display).

- Tooltip blockers use the existing `lucide-react` icons; toast for non-ready
  click attempts.

**Test plan**
1. Create event, no teams, no resources → button disabled, hover shows blockers.
2. Add 2 teams with captains and resources → button enabled.
3. Click → confirmation dialog → toast → page refreshes → phase pill shows
   `budget offer` → button becomes "Open projector" / "Live view".

### Phase B — Captain budget acceptance

**Goal:** During `budget_offer`, the captain sees a full-screen "Accept your
budget" card on `/team`. When all teams have accepted, server auto-transitions
to `build` and starts the timer.

Files:

- `src/app/(team)/team/actions.ts` — add:
  - `acceptBudgetAction()` — sets `teams.budget_accepted_at = now()` for the
    team in the session. Then runs `maybeAdvanceFromBudgetOffer(eventId)`.
  - Helper inside `game-engine.ts` or `events.ts`:
    `maybeAdvanceFromBudgetOffer(eventId)` — counts teams vs. teams with
    `budget_accepted_at NOT NULL`. If all match, call
    `transitionEventPhase(eventId, 'build')` (which sets `timer_started_at` +
    `timer_ends_at` per the existing logic).

- `src/app/(team)/team/team-console.tsx` — branch on `event.current_phase`:
  - `setup` → show "Waiting for the admin to start the event…" placeholder.
  - `budget_offer` → if caller's role is captain (check via session — currently
    we store `teamId` but not the captain user; for MVP, *any* team member can
    accept on behalf of the team) show the **Accept Budget** card with the
    budget amount and a big primary button. Other members see "Waiting for
    captain to accept…"
  - `build` / `trading` → marketplace (already built).
  - `submission` / `drop_test` / `scoring` / `final` → "Game in progress / Done"
    placeholders for now.

**Open question**: the team session today is per-device, not per-user. There's
no way to tell which member is the captain. Three options:
- (a) Allow any member to accept (simplest, but anyone in the team can do it).
- (b) Require the captain's name in the cookie at join time.
- (c) Generate a separate captain-only code that gets emailed.

**Recommendation: (a) for now.** Add a banner "Captain {name} — confirm budget
for the team" so the social pressure does the right-person check. Tighten later.

**Test plan**
1. Admin starts event → 2 captains across 2 teams see Accept screen.
2. Captain 1 clicks Accept → captain 1's team status changes, the other team
   still on Accept screen.
3. Captain 2 clicks Accept → server detects all accepted → phase auto-flips to
   `build`, timer starts, marketplace opens for all teams.
4. Projector view (Phase C) shows team status pills updating as accepts come in.

### Phase C — Live game view

**Goal:** One spectator-grade page inside `/admin` that the admin opens and
screen-shares to the venue display. Auto-updates every ~3 s. Has a togglable
controls overlay for the admin to advance phases / mark teams without leaving
the page.

Files:

- `src/app/actions/live.ts` (new) — `getLiveSnapshot(eventId)`:
  ```ts
  interface LiveTeam {
    id: string
    name: string
    color: string | null
    captain: { id, full_name, avatar_url } | null
    members: { id, full_name, avatar_url }[]   // excludes captain
    budget_accepted_at: string | null
    is_submitted: boolean
    status: 'active' | 'disqualified' | 'winner' | null
    total_budget: number
    spent_amount: number
    remaining_balance: number
    recent_purchases: { resource_name: string, total_price: number, created_at: string }[]  // last 3
    score?: { total: number, egg: number, shield: number, innovation: number, budget_eff: number }
  }
  interface LiveSnapshot {
    event: { id, name, current_phase, timer_started_at, timer_ends_at }
    teams: LiveTeam[]
    ticker: { team_name, color, resource_name, created_at }[]  // last 10 transactions
  }
  ```
  Joins `teams`, `team_members`, `team_wallets`, `submissions`,
  `inventory_transactions` (last 3 per team via window function or N+1 with
  `LIMIT 3` per team), `scores`.

- `src/app/(admin)/admin/events/[id]/live/page.tsx` (new) — server component:
  - Auth already enforced by `proxy.ts` for `/admin/*`.
  - Calls `getLiveSnapshot(eventId)`. Passes to `<LiveScreen />`.
  - **Bypass the standard admin layout** — this page should fill the viewport
    with no top bar, no tab strip. Use a parallel layout under
    `(admin)/admin/events/[id]/live/layout.tsx` that overrides the parent.
    (In Next.js app router, a layout at this level replaces ancestors only if
    we use a route group like `(live)`; simpler approach: server-render the
    page body and use absolute positioning to cover the parent.)

- `src/app/(admin)/admin/events/[id]/live/live-screen.tsx` (new) — client:
  - On mount, `setInterval(() => startTransition(() => router.refresh()), 3000)`.
    Cleanup on unmount.
  - State: `showControls: boolean` (default `true`). Toggled by **H** key or
    the corner button. Persist to `localStorage` so the admin's preference
    sticks during screen-share.
  - Renders `<LiveHeader />`, `<LiveGrid />`, `<LiveTicker />`, and the
    `<ControlsOverlay />` when `showControls`.

- `src/app/(admin)/admin/events/[id]/live/live-header.tsx` — event name,
  current phase pill, large countdown timer driven by `event.timer_ends_at`
  (reuse / adapt `RealtimeTimer`).

- `src/app/(admin)/admin/events/[id]/live/team-card.tsx` — phase-aware:
  ```
  budget_offer  → 'PENDING ACCEPT' (zinc) or '✓ ACCEPTED' (emerald)
  build         → 'BUILDING' (sky)
  trading       → 'TRADING' (violet)
  submission    → '✅ SUBMITTED' or '⌛ WAITING' (amber)
  drop_test     → 'AWAITING DROP' or 'SCORED · N pts'
  scoring/final → '#N · NN pts'
  ```
  Top edge uses team color. Captain row (avatar + name + crown) bigger than
  members. Members shown as an avatar strip with name labels under each.
  Budget bar and recent-purchases list below.

- `src/app/(admin)/admin/events/[id]/live/live-ticker.tsx` — horizontally
  scrolling marquee of the last 10 `inventory_transactions`.

- `src/app/(admin)/admin/events/[id]/live/controls-overlay.tsx` — floating
  panel (top-right by default), draggable optional. Phase-aware buttons:
  - `budget_offer` → "Force advance to Build" (skip waiting on stragglers).
  - `build` / `trading` → "Open trading window" (sets `trading`), "Advance to
    Submission" (sets `submission`).
  - `submission` → "Advance to Drop Test" once all submissions in.
  - Always: "Mark a team submitted / disqualified" submenu.
  - **Hide controls** button collapses the panel to a small circular button at
    the same corner. Same toggle as the **H** key.

**Visual style notes**
- Dark background (zinc-950 or `#0a0a0f`) for spectator clarity.
- Team color used as the card's top border (4 px).
- Plus Jakarta Sans for headlines, Inter for body.
- Avatar strip: circular, white-bordered, 36-44 px.
- Big readable typography — assume 5–10 m viewing distance and 1080p screen
  share.

**Test plan**
1. From event header click **Open live view** → `/admin/events/[id]/live`
   renders full-bleed dark spectator screen with current-phase pill +
   countdown.
2. With event in `budget_offer`, every team card shows PENDING ACCEPT. Have a
   captain accept on `/team`; within ~3 s their card flips to `✓ ACCEPTED`.
3. After all teams accept, phase auto-flips to `build`, timer starts; cards
   flip to BUILDING.
4. Make a purchase on `/team` → live page spend bar and recent-purchases list
   update within 3 s; ticker shows the transaction.
5. Press **H** → controls collapse to a corner pill. Press **H** again →
   controls reappear. State persists across refresh (`localStorage`).
6. In controls overlay, click "Advance to Submission" → phase pill changes,
   cards switch to waiting/submitted styling.

### Phase D — Submission flow, drop test, scoring

Outside this handoff's scope. See `planofaction.md` Phase 1.5 onward. Highest
priority bits:
- `/team` submit button → writes to `eggdrop.submissions`.
- `/judge` UI for marking received + running drop tests + entering rubric.
- Scoring: `recordDropTestAndScore()` calculates from rubric + `team_wallets`
  budget efficiency formula `(1 - spent/total) * 20`.
- Leaderboard panel on the projector + a final-screen winner card.

---

## Conventions to match

- **Server actions**: live in `src/app/actions/*.ts` (cross-cutting) or
  colocated under the route (`team/actions.ts`, `events/[id]/teams/teams-manager.tsx` etc.).
- **Types**: in `src/lib/*.ts` when reused across server + client.
- **UI primitives**: shadcn / base-ui via `src/components/ui/*`. Stick with them.
- **Fonts**: Inter (body) + Plus Jakarta Sans (display, applied via
  `font-display` class).
- **Background patterns**: `.bg-auth-surface` and `.bg-auth-grid` in
  `globals.css`. For the projector, prefer a clean dark gradient.
- **Toasts**: `sonner` — `toast.success(...)`, `toast.error(...)`, `toast.message(...)`.
- **Icons**: `lucide-react`.
- **Confirms**: `window.confirm()` for now — replace with a dialog later if it
  starts feeling cheap.

---

## Known issues to clean up (not blocking)

- `[browser] Image with src "/edstellar-logo.png" has either width or height
  modified, but not the other.` — the warning still fires from
  `src/app/(admin)/admin/page.tsx` (small) and the empty-state pages.
  Fix by adding explicit `style={{ width: 'auto' }}` on those `<Image>`s.
- `Warning: Next.js inferred your workspace root, but it may not be correct.`
  in dev logs — caused by a stray `package-lock.json` at
  `C:\Users\Edstellar\Downloads\package-lock.json`. Set `turbopack.root` in
  `next.config.ts` to silence, or delete the stray file.
- Dev sessions sometimes don't release port 3000 when the npm wrapper is killed
  but the child `next dev` keeps listening. If you can't restart, find the PID:
  `netstat -ano | grep ":3000.*LISTENING"` → `cmd.exe //c "taskkill /PID <pid> /F"`.
- `launch-event-controls.tsx` is orphaned (not imported anywhere). Safe to
  delete when convenient.

---

## How to run locally

```
npm install
# .env.local needs:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL,
#   EGGDROP_DB_SCHEMA=eggdrop
# PROJECTOR_TOKEN_SECRET is currently set but no longer used (kept for now).
npm run dev -- --port 3000
```

Type-check before pushing: `npx tsc --noEmit`.

---

## Repo

- Remote: `https://github.com/edstellarmarketing/eggdrop.git`
- Vercel deploy: `https://eggdrop-ebon.vercel.app`
- Default branch: `master`
- Latest pushed commit at handoff: see `git log -1` (the local working tree may
  be ahead of remote — user prefers feature-complete pushes only).
