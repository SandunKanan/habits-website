# Habit Tracker

React + Vite habit tracker with Supabase-backed storage, Supabase Auth, and a small admin surface.

## Local development

Install dependencies and run:

```bash
npm install
npm run dev
```

If the Supabase variables are not set, the app falls back to `src/data/habits.json` for local storage and skips auth.

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

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Vercel deployment

1. Import the repo into Vercel.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Vercel project environment variables.
3. In Supabase Auth settings, enable the email/password provider.
4. Deploy.

The first authenticated load for a user will seed their `user_habits_state` row from `src/data/habits.json` if they do not yet have saved habits.
