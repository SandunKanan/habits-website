create table if not exists public.user_habits_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  habits jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_habits_state enable row level security;
