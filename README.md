# Habit Tracker

Habit Tracker is a React + Vite app for shaping day-to-day behavior around a bigger direction.

It started as a habit tracker, but the product now has a few connected layers:

- `Habits`: recurring actions you want to keep showing up for
- `Attributes`: qualities those actions strengthen, like Fitness, Focus, or Calm
- `Vision`: the person and life the system is meant to support
- `Focus`: the current block you are actively shaping
- `Goals`: longer-term outcomes and subgoals
- `Pursuits`: learnings, courses, and personal projects
- `Tracking`: daily numeric metrics like protein, water, calories, or exercise time

The core idea is to keep daily action grounded in something more meaningful than a checklist.

## What A Good README Should Do

For a project like this, the README should:

- explain what the product is, not just how to run it
- give a quick map of the important concepts and pages
- make local setup easy for a new contributor
- document required environment variables and database setup
- reflect the current state of the app without trying to duplicate every implementation detail

That is the structure this README follows.

## Product Overview

### Daily use

- `Today` gives a focused list of what matters now
- recurring habits can be marked done, skipped, or worked through via subtasks
- one-off completed tasks can be logged directly on Today
- metric values can be logged for the current day from the Today page

### Growth model

- habits can link to attributes with numeric contribution weights
- attributes can optionally use linear daily decay
- focus attributes can be highlighted across the app
- one-off completed tasks can also contribute to attributes

### Direction layer

- `Vision` captures the user’s ideal self
- `Focus` defines the current block and what the user is focusing on within goals
- `Goals` support long-term or fixed-timeframe outcomes, with optional subgoals
- `Pursuits` hold courses, learnings, and projects, and can be linked to goals or subgoals

### History and correction

- `History` shows habit completions, skips, one-off completed tasks, and tracked metric entries
- past one-off tasks can be logged from History to backfill activity

## Current Feature Set

- recurring habits with interval or rate-based frequency
- subtasks with daily completion tracking
- Today page with curated task list, completed, skipped, and upcoming sections
- browser-visible branding updated to `Habit Tracker`
- user-created attributes
- habit-to-attribute links with numeric weights
- attribute scoring with optional linear daily decay
- focus attributes with optional highlight styling
- Vision page
- Focus page
- Goals page with subgoals
- Pursuits page
- one-off completed tasks with optional attribute contributions
- Tracking page for numeric daily metrics
- History page covering all major record types
- Supabase Auth support
- small admin surface

## Main Pages

- `Today`
  - recurring habits due now
  - completed habits
  - skipped habits
  - upcoming habits
  - log one-off tasks completed today
  - log today’s metric values

- `Habits`
  - create and edit recurring habits
  - define subtasks
  - link habits to attributes

- `Attributes`
  - create and manage attributes
  - view current attribute scores
  - optional linear decay
  - see top contributors

- `Growth`
  - `Vision`
  - `Focus`
  - `Goals`
  - `Pursuits`

- `More`
  - `History`
  - `Tracking`
  - `Settings`
  - `Help`

## Tech Stack

- React
- Vite
- React Router
- Supabase Auth
- Supabase Postgres via REST endpoints
- SCSS

## Local Development

Install dependencies and run:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Set these values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional demo login:

- `VITE_DEMO_EMAIL`
- `VITE_DEMO_PASSWORD`

If the demo variables are set, the auth page shows a `Try demo account` button.

## Supabase Setup

1. Create a Supabase project.
2. In Supabase Auth, enable email/password auth.
3. Run [supabase/schema.sql](/Users/sandunkanangama/Documents/Code/habits-website/supabase/schema.sql) in the SQL editor.
4. Add the environment variables listed above.

The schema file currently includes support for:

- habits
- completions
- skips
- attributes
- habit-to-attribute links
- vision
- focus
- goals
- pursuits
- one-off tasks
- tracking metrics
- tracking metric entries
- settings
- user roles

## Data Model Summary

### Habits and completion

- `habits`
- `habit_completions`
- `habit_skips`

### Attributes

- `attributes`
- `habit_attribute_links`

### Direction and planning

- `visions`
- `vision_focus_attributes`
- `focus_periods`
- `goals`
- `learning_items`

### One-off activity and tracking

- `one_off_tasks`
- `track_metrics`
- `track_metric_entries`

### User preferences and roles

- `user_settings`
- `user_roles`

## Deployment

### Vercel

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

## Notes For Future Cleanup

- `supabase/schema.sql` is currently the canonical full-state schema file
- over time, this would benefit from moving to incremental migrations
- some older database column names still reflect earlier wording even where the UI has been updated

## Status

This project is no longer just a basic habit tracker. It is now a habit, growth, and direction app with:

- daily execution
- growth attributes
- reflective planning
- goals and pursuits
- one-off task logging
- numeric daily tracking

That is the level the README now documents.
