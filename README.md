# Asclepius

Medical-education web platform: **video lessons** and **exams**.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev                  # http://localhost:3000
```

## Database

Migrations live in `supabase/migrations/`. The CLI is linked to the `Asclepius` Supabase project.

```bash
supabase link --project-ref tbyqvtgafqcgvpqqmhfi   # once per machine
supabase db push                                    # apply migrations
npm run db:types                                    # regenerate TS types
```

See [AGENTS.md](./AGENTS.md) for architecture, conventions, and security rules.
