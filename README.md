# Korusa

A social network and a learning platform in one codebase. People post, follow each
other, trade direct messages, run 24-hour stories, and read courses — all from the
same account and the same feed.

There is no custom API server. The frontend talks to Supabase directly and every
row it touches is filtered by Postgres row-level security. Almost all of the
interesting logic (who may message whom, who may see a story, what an analytics
number means) lives in SQL, not in React.

---

## What is actually working

Worth knowing before you start clicking around, because the app mixes real and
prototype screens behind the same navigation.

**Real, backed by the database:**

- Home feed with latest/following scopes, likes, comments, trending hashtags
- Post creation with media upload
- Direct messaging — realtime, with reactions, replies, forwards, pins, edits,
  delivery/read receipts, typing indicators, per-conversation mute/archive/pin
- Stories: upload, 24h expiry, viewers, reactions, private replies that land as
  real messages
- Notifications (likes, comments, follows, story reactions) with realtime unread badge
- Profiles: follow/unfollow, followers/following lists with search, block, mute, report
- Creator analytics with date ranges, charts and CSV export
- Settings, profile editor

**Mocked (canned data, no backend calls):**

- `/assistant` — the standalone chat assistant screen. Note this is *not* the same
  thing as the AI tools inside Messages, which are real.
- `/explore`, `/sparks`, `/learn`, `/learning`, course detail pages

So: chat AI works, assistant screen does not. Learning UI exists, learning data
does not. Treat those screens as design comps.

---

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 6, TypeScript 5.8 |
| UI | React 19, Tailwind CSS 4 (`@tailwindcss/vite`), `motion`, `lucide-react` |
| Charts | `recharts` |
| Routing | `react-router-dom` 7 |
| State | `zustand` (one store, `src/store/uiStore.ts`) |
| Backend | Supabase — Postgres, RLS, RPCs, realtime, storage, edge functions |
| AI | One edge function proxying an OpenAI-compatible endpoint |
| Hosting | Vercel (SPA rewrite) |

No react-query, no redux, no context providers. Server state lives in component
`useState`/`useEffect` and is refreshed by re-running loaders.

---

## Running it locally

```bash
npm install
cp .env.example .env      # then fill in your Supabase project values
npm run dev               # http://localhost:3000
```

Other scripts:

```bash
npm run build     # vite build -> dist/
npm run preview   # serve the built output
npm run lint      # tsc --noEmit (typecheck only — there is no linter or test runner)
npm run clean     # rm -rf dist
```

`npm run lint` is the only check that exists for the frontend, so run it before
you commit anything.

---

## Environment variables

`.env` is gitignored. Two values are needed to boot at all, and
`src/lib/supabase.ts` throws during module load if either is missing.

```
VITE_SUPABASE_URL       https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY   public anon key
```

Both are `VITE_`-prefixed, which means Vite inlines them into the browser bundle.
That is fine for the URL and the anon key — the anon key is *designed* to be
public and is constrained by your RLS policies. Never put a secret in a `VITE_`
variable; the `service_role` key bypasses RLS entirely and must not appear here.

The AI secrets are different. They live server-side in Supabase's secret store and
never reach the browser:

```bash
supabase secrets set AI_API_URL="..." AI_API_KEY="..." AI_MODEL="..."
```

---

## Project layout

```
src/
  App.tsx                     routes, session bootstrap, sign-out
  main.tsx                    BrowserRouter + mount
  components/
    layout/AppLayout.tsx      shell: sidebar, navbar, bottom nav, notification sub
    features/                 one folder per feature (auth, chat, content,
                              learning, profile, stories, notifications, ...)
    ui/                       Button, Input, Modal, Avatar, Cards, skeletons
  lib/                        the data layer — see below
  store/uiStore.ts            auth flag, theme, sidebar, unread count, cart
supabase/
  migrations/                 12 files, applied in filename order (date-prefixed)
  functions/korusa-ai/        the only edge function (50 lines)
  tests/                      6 SQL test files
```

### Routing and auth

`App.tsx` holds the route table. Public routes (`/login`, `/signup`,
`/forgot-password`) render `LandingView` and bounce authenticated users to
`/home`. Everything else sits under an `AppLayout` outlet guarded by
`ProtectedRoute`, which reads `isAuthenticated` from the zustand store and
redirects to `/login` preserving `location.state.from`.

The store's auth flag is seeded once from `supabase.auth.getSession()` and then
kept in sync by `onAuthStateChange`. An `authReady` gate renders a spinner until
that first resolve, so the app never flashes the login screen while a session is
being restored.

`AppLayout` decides how much chrome a page gets: `FULL_SCREEN_PAGES`
(`assistant`, `messages`, `sparks`) drop the sidebar and bottom nav entirely;
`WIDE_PAGES` (`analytics`, `explore`, `home`, `learn`) widen the content column.
It is also the single owner of the notifications realtime subscription — the
unread badge is fed from there, not from each screen.

---

## The data layer

Every Supabase call is grouped by domain in `src/lib/`:

| Module | Covers |
|---|---|
| `feed.ts` | posts, likes, comments, trending tags |
| `messages.ts` | conversations, messages, reactions, typing, realtime channels |
| `stories.ts` | story feed, upload, views, reactions, replies, insights |
| `notifications.ts` | fetch, unread count, mark read, realtime |
| `profiles.ts` | profile overview, follow lists, block/mute/report, image upload |
| `social.ts` | follow/unfollow, friend suggestions |
| `analytics.ts` | creator overview, timeseries, top posts, CSV export |
| `postViews.ts` | batched client-side view queue |
| `messagingAi.ts` | invokes the `korusa-ai` edge function |

The pattern throughout: the client calls a `security definer` RPC rather than
doing raw table access, and the RPC decides what the caller is allowed to see.
Function names tell you the intent — `get_my_conversations`,
`get_story_feed`, `get_profile_overview`, `get_creator_overview`. There is no
generic `getPost(id)`; read paths are purpose-built.

**Storage buckets.** Two are private and read through short-lived signed URLs;
two are public and served straight from the CDN:

| Bucket | Used for | Access |
|---|---|---|
| `message-media` | chat attachments (25 MB cap) | private, signed — path `{user_id}/{conversation_id}/...` |
| `story-media` | stories (50 MB cap) | private, signed — path `{user_id}/{file}` |
| `post-media` | feed attachments | public, `getPublicUrl` |
| `avatars` | profile photos and covers | public, `getPublicUrl` |

The storage policies on the private buckets reuse the same SQL predicates as the
table policies — `is_conversation_member()` guards message media,
`can_view_user_stories()` guards story media — so a file and its row can't
disagree about who may read it.

---

## The database

The base schema (`profiles`, `posts`, `comments`, `likes`, `follows`) existed
before this repo's `supabase/` directory and is not checked in. The twelve
migrations here build on top of it, in filename order:

```
20260725_messaging                  conversations, members, messages
20260725_friend_messaging           friend/turn rules for sending
20260726_profile_cover              cover image + position/zoom columns
20260726_profile_social_controls    user_blocks, user_mutes, user_reports
20260726_rich_messaging             message types, media, reactions, bucket
20260810_messaging_finalization     delivery receipts, inbox behaviour
20260815_stories                    stories, views, audience rule, bucket
20260816_story_reactions_replies    story_reactions, send_story_reply
20260817_notifications              notifications table + triggers
20260818_post_views_and_analytics   post_views + six analytics RPCs
20260823_friend_suggestions_fix     stop suggesting people you follow
20260823_profile_page               profile overview, follow lists, handles
```

Three ideas hold it together:

**1. Authorization is a handful of reusable predicates.**
`is_conversation_member()`, `are_friends()` (mutual follow), `can_message_conversation()`
(you are friends, *or* the last message in the thread wasn't yours — the turn rule),
`can_view_user_stories()` (you follow them, or you have an answered conversation
with them, and neither of you has blocked the other), `is_blocked_between()`.
RLS policies and storage policies both call these, which is why they can't drift.

**2. Derived data has no client write path.**
`notifications` and `post_views` have no INSERT policy *and* `revoke all` from
`authenticated` *and* a single `security definer` writer that only triggers call.
A client cannot insert a notification about someone else, or inflate a view count,
no matter what it sends to PostgREST. Same for `read_at` — you get a column-level
`grant update (read_at)` on notifications, so you can mark things read but not
rewrite what they say.

**3. Counts and lists are treated differently.**
Profile counts are unfiltered by block state (a count is a fact about the target)
while the lists underneath are filtered (a list is a view for you). Story view and
reaction totals are only returned to the story's author. Analytics deliberately
*do* include blocked people so the numbers on the chart match the numbers printed
on the post.

Other things worth knowing: realtime tables carry `replica identity full` so
DELETE payloads still match `user_id=eq.<me>` filters and the unread badge can
actually fall; follow lists paginate on a `(followed_at, id)` keyset because a
timestamp alone loses rows when two follows share a microsecond.

---

## The AI

`supabase/functions/korusa-ai/index.ts` is fifty lines and does one job: take a
short text snippet, rewrite it, hand it back.

It accepts `{ action, input, tone?, language?, context? }` where `action` is one
of ten allowlisted strings — `rewrite`, `fix_grammar`, `translate`, `change_tone`,
`summarize`, `suggest_replies`, `hashtags`, `caption`, `explain`, `search`. Each
maps to a fixed system-prompt instruction. The provider endpoint and key come
from `AI_API_URL` / `AI_API_KEY` / `AI_MODEL`, and the response parser tolerates
chat-completions, Responses-API and a generic `output` shape.

It has no Supabase client, no service-role key, and never reads or writes a row.
The caller decides what to do with the returned text — in Messages that's usually
"replace my draft". From the client it's a single call:

```ts
// src/lib/messagingAi.ts
runMessagingAi('translate', text, { language: 'Spanish' })
  // -> supabase.functions.invoke('korusa-ai') -> { output: string }
```

---

## Tests

```bash
psql "$DATABASE_URL" -f supabase/tests/analytics_test.sql
```

or paste a file into the Supabase SQL Editor and run it **without RLS** (the
fixtures insert into `auth.users` and `profiles` directly).

Plain SQL, no pgTAP. Each file is self-contained: a fail-fast precondition check
that tells you which migration is missing, a temp results table, helpers
(`pg_temp.expect`, `pg_temp.skip`, `pg_temp.act_as(user uuid)` which impersonates
a user by setting `request.jwt.claims`), fixtures under a per-file UUID prefix so
all six can run in one session in any order, and a single verdict result set —
`PASSED` / `FAILED` / `PASSED WITH SKIPS` followed by every check in order.
Everything rolls back.

The interesting assertions are the negative ones: that `authenticated` cannot
INSERT into `post_views` or `notifications` (expects SQLSTATE `42501`), that a
story reply can't be used to message someone who blocked you, that a one-way
follow is never suggested, that two different viewers get different answers from
`get_profile_overview`.

---

## Deploying

`vercel.json` rewrites every path to `index.html` so deep links work on refresh.
`vite.config.ts` sets `base: './'` so the bundle is path-independent.

Build and environment are otherwise unremarkable: set the two `VITE_` variables in
the Vercel project, deploy `dist/`, and remember to set the three AI secrets in
Supabase separately — they are not part of the frontend build.

---

## Rough edges

Things that will bite you if you don't know about them:

- **The settings theme toggle does nothing.** `Settings.tsx` declares a local
  `isDarkMode` state instead of using the store's `toggleTheme`, so flipping it
  there won't change the app theme. The real toggle is elsewhere.
- **Two definitions of `get_or_create_direct_conversation` exist in the
  migrations**, and which one wins depends on apply order (the two `20260725_`
  files sort badly against each other). Later migrations deliberately inline their
  own upsert to avoid it. If you're rebuilding the schema from scratch, reconcile
  these first.
- **Stories never get cleaned up.** Expiry is enforced by `expires_at > now()` on
  every read, but expired rows and storage objects accumulate. There's a pg_cron
  recipe in the comments of `20260815_stories.sql`.
- **Dead code:** `Reels.tsx`, `CourseDetail.tsx`, `PlaceholderView`,
  `shared/Modals.tsx` (all four are exported and never imported anywhere), a
  duplicate `ProtectedRoute` in `RouteGuard.tsx`, several never-called store
  actions, and the OTP/recovery views in `Auth.tsx` — they render, but call no
  auth API and nothing navigates to them.
- **`@google/genai` is a dependency and `process.env.GEMINI_API_KEY` is defined in
  the vite config, but nothing in `src/` imports either.** Leftovers from before AI
  moved into the edge function.
- **`Auth.tsx` sleeps for 1.5 seconds on mount** on purpose. It's an artificial
  delay, not a real request.
- **The edge function doesn't verify the caller's JWT in code.** Whatever
  Supabase's platform-level `verify_jwt` setting is at deploy time is all that
  stands in front of it. Worth confirming on your project.
