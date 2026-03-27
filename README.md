# Habit Tracker

React + Vite habit tracker with Supabase-backed storage, Supabase Auth, subtasks, attributes, and a small admin surface.

## What it does

- Manage recurring habits with interval or rate-based frequency
- Use the Today page as a focused working list
- Track subtasks inside larger habits
- Review day-by-day history
- Create attributes and link habits to them with numeric contribution weights
- Optionally apply linear daily decay to attribute scores

## Local development

Install dependencies and run:

```bash
npm install
npm run dev
```

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [supabase/schema.sql](/Users/sandunkanangama/Documents/Code/habits-website/supabase/schema.sql).
3. In Supabase Auth settings, enable the email/password provider.
4. Copy your project URL, publishable key, and service role key from project settings.

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

Optional demo login:

- `VITE_DEMO_EMAIL`
- `VITE_DEMO_PASSWORD`

If the demo variables are set, the auth page will show a `Try demo account` button.

## Attributes

Attributes are user-created growth areas such as `Fitness`, `Focus`, or `Calm`.

- Habits can link to one or more attributes
- Each link has a numeric contribution weight
- Attribute score is based on habit completions
- Attributes can optionally use linear daily decay so older completions fade over time

## Vercel deployment

1. Import the repo into Vercel.
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. If you want demo access in production, also add:
   - `VITE_DEMO_EMAIL`
   - `VITE_DEMO_PASSWORD`
4. Deploy.
