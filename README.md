# Habits Website

React + Vite habits tracker with Vercel API routes and a Supabase-backed store.

## Local development

Install dependencies and run:

```bash
npm install
npm run dev
```

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set, the app falls back to `src/data/habits.json` for local storage.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [supabase/schema.sql](/Users/sandunkanangama/Documents/Code/habits-website/supabase/schema.sql).
3. Copy your project URL and service role key from Supabase project settings.

## Environment variables

Create `.env.local` from [.env.example](/Users/sandunkanangama/Documents/Code/habits-website/.env.example):

```bash
cp .env.example .env.local
```

Set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Vercel deployment

1. Import the repo into Vercel.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Vercel project environment variables.
3. Deploy.

The first load will seed Supabase from `src/data/habits.json` if the `habits_state` row is empty.
