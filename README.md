# Habits Website

React + Vite habits tracker with Supabase-backed storage, Supabase Auth, and row-level security.

## Local development

Install dependencies and run:

```bash
npm install
npm run dev
```

The app expects Supabase to be configured for auth and habits data.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [supabase/schema.sql](/Users/sandunkanangama/Documents/Code/habits-website/supabase/schema.sql).
3. Copy your project URL, publishable key, and service role key from Supabase project settings.

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

The `VITE_` variables are used by the browser app. The service-role variables are no longer used for normal habit CRUD, but can be kept for future admin/server features.

## Vercel deployment

1. Import the repo into Vercel.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Vercel project environment variables.
3. Optionally also add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if you plan to add admin/server features later.
4. In Supabase Auth settings, enable the email/password provider.
5. Deploy.
