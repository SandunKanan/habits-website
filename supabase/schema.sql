create extension if not exists pgcrypto;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  every_x_days integer not null check (every_x_days >= 1),
  importance integer not null check (importance >= 0),
  initial_last_done date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slug)
);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (habit_id, completed_on)
);

create index if not exists habits_user_id_idx on public.habits (user_id);
create index if not exists habit_completions_user_id_idx on public.habit_completions (user_id);
create index if not exists habit_completions_habit_id_idx on public.habit_completions (habit_id);

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
