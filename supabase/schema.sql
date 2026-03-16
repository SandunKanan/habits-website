create extension if not exists pgcrypto;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  frequency_mode text not null check (frequency_mode in ('interval', 'quota')),
  frequency_value integer not null check (frequency_value >= 1),
  frequency_unit text not null check (frequency_unit in ('day', 'week', 'month')),
  importance integer not null check (importance >= 0 and importance <= 10),
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

drop policy if exists "Users can read own habits" on public.habits;
create policy "Users can read own habits"
  on public.habits
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own habits" on public.habits;
create policy "Users can insert own habits"
  on public.habits
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own habits" on public.habits;
create policy "Users can update own habits"
  on public.habits
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own habits" on public.habits;
create policy "Users can delete own habits"
  on public.habits
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own completions" on public.habit_completions;
create policy "Users can read own completions"
  on public.habit_completions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own completions" on public.habit_completions;
create policy "Users can insert own completions"
  on public.habit_completions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.habits
      where public.habits.id = habit_id
        and public.habits.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own completions" on public.habit_completions;
create policy "Users can update own completions"
  on public.habit_completions
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.habits
      where public.habits.id = habit_id
        and public.habits.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own completions" on public.habit_completions;
create policy "Users can delete own completions"
  on public.habit_completions
  for delete
  using (auth.uid() = user_id);
