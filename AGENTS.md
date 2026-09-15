<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KawaiiMedicine — MedEd platform (video lessons + exams)

Medical-education web app. Two core features: **VDO** (course video lessons with progress tracking) and **EXAM** (multiple-choice exams with server-side grading).

## Stack

- Next.js 16 (App Router, `src/` dir, Turbopack), React 19, TypeScript, Tailwind CSS v4
- Supabase: Postgres + Auth + Storage, accessed with `@supabase/ssr` + `@supabase/supabase-js`
- Package manager: **npm** (lockfile committed)
- Deploy: Vercel, production `https://kawaiimedicine.vercel.app` (auto-deploys from `main`). Env vars are set in the Vercel dashboard, not in the repo.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm run db:types   # regenerate src/lib/supabase/database.types.ts from the linked project
supabase db push   # apply supabase/migrations to the linked remote project
supabase migration new <name>
```

## Supabase

- Project ref `tbyqvtgafqcgvpqqmhfi`, region ap-northeast-2, URL `https://tbyqvtgafqcgvpqqmhfi.supabase.co`
- CLI is linked (`supabase/.temp` is git-ignored). Config in `supabase/config.toml`.
- Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is safe in the browser; RLS is the security boundary. `SUPABASE_SECRET_KEY` is server-only and must never be imported into client code.
- **Never run `supabase config push`.** It applies the whole `config.toml` auth section to the hosted project and, when stdin is not a TTY, does so without asking. `config.toml` is for local dev only. Change hosted auth settings in the Supabase Dashboard (or a targeted Management API PATCH).
- **Never commit `.env.local`** or paste the secret key / DB password into code, docs, or chat logs.

### Clients

- Client Components: `createClient()` from `src/lib/supabase/client.ts`
- Server Components / Server Functions / Route Handlers: `await createClient()` from `src/lib/supabase/server.ts` (new client per request)
- `src/proxy.ts` (Next 16 name for middleware) refreshes the session cookie and redirects anonymous users away from `/learn`, `/exam`, `/admin`. Do real authorization in the page/route with `supabase.auth.getUser()`, not only in the proxy.

### Schema (see `supabase/migrations/`)

- `profiles` (1:1 with `auth.users`, `role` = student | instructor | admin, auto-created by trigger)
- `courses` → `videos` (source is `storage_path` in private `videos` bucket **or** `external_url`) ; `video_progress` per user
- `exams` → `questions` → `choices` ; `exam_attempts` → `attempt_answers`
- Helpers: `is_staff()`, `current_user_role()` (security definer, safe to use in policies)

### Security rules that must hold

- `choices.is_correct` is never readable by students. Students read choices via the `exam_choices` view. Do not add a student SELECT policy on `choices`.
- Grading is done only by the `submit_exam_attempt(uuid)` RPC. Students have no UPDATE policy on `exam_attempts`.
- Every new table gets RLS enabled and explicit policies in the same migration.
- Students only ever see `is_published = true` content. Staff (`is_staff()`) see everything.
- Video files live in the private `videos` bucket; serve with signed URLs, never public URLs.

### Auth

- Methods: **Google OAuth** and **Magic Link** only. No passwords. Users use personal email (no domain restriction).
- `src/app/login/` — page + Server Functions `signInWithGoogle` / `sendMagicLink`.
- `src/app/auth/callback/route.ts` — handles PKCE `code` (Google, magic link) and `token_hash`+`type`. Always pass `?next=` and sanitize it with `safeNextPath()`.
- `src/app/auth/signout/route.ts` — POST only.
- `requireUser()` from `src/lib/auth/require-user.ts` in every protected Server Component / Server Function.
- Redirect URLs must be allow-listed in Supabase → Authentication → URL Configuration: `https://kawaiimedicine.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`, and a wildcard for Vercel previews. Site URL is the Vercel production origin.
- Google provider is configured in Supabase Dashboard → Authentication → Providers (Client ID/Secret from Google Cloud Console). Not stored in this repo.

### Error tracking

- Sentry (`@sentry/nextjs`), wired the Next.js-16-native way: `src/instrumentation.ts` (server/edge `Sentry.init` + `onRequestError`) and `src/instrumentation-client.ts` (browser `Sentry.init`, replaces the old `sentry.client.config.ts` pattern). `next.config.ts` wraps with `withSentryConfig` from `@sentry/nextjs/config` (not the deprecated top-level export).
- `src/app/error.tsx` and `src/app/global-error.tsx` both report the caught error via `Sentry.captureException`.
- Env: `NEXT_PUBLIC_SENTRY_DSN` (safe in the browser, it's a write-only key). Optional `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` enable sourcemap upload for readable production stack traces — without them the build just skips that step.

## Conventions

- Schema changes go in a new file under `supabase/migrations/` (`supabase migration new <name>`), then `supabase db push`, then `npm run db:types`. Do not edit the dashboard by hand.
- Next.js 16 specifics: `cookies()`, `headers()`, `params`, `searchParams` are **async** — always `await` them. Middleware is `proxy.ts`. Read `node_modules/next/dist/docs/` when unsure.
- Prefer Server Components for data fetching; use Server Functions (`"use server"`) for mutations; keep the browser client for realtime/interactive bits only.
- Route groups: `(public)` for marketing/login, `(app)` for signed-in student pages, `admin/` for staff.
- UI text is Thai-first with English fallback where relevant (medical terms may stay English).
- Run `npm run lint` and `npm run build` before committing.
- `docs/roadmap.md` tracks the feature roadmap derived from student survey feedback. Check it before starting new feature work, and update its status checkboxes/log when a roadmap item is picked up or shipped.
