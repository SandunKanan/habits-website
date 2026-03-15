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

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_habits_state'
  ) then
    insert into public.habits (user_id, slug, name, every_x_days, importance, initial_last_done)
    select
      uhs.user_id,
      habit_item->>'id',
      habit_item->>'name',
      coalesce(nullif(habit_item->>'everyXDays', '')::integer, 1),
      coalesce(nullif(habit_item->>'importance', '')::integer, 0),
      nullif(habit_item->>'initialLastDone', '')::date
    from public.user_habits_state uhs
    cross join lateral jsonb_array_elements(uhs.habits) as habit_item
    on conflict (user_id, slug) do update
    set
      name = excluded.name,
      every_x_days = excluded.every_x_days,
      importance = excluded.importance,
      initial_last_done = excluded.initial_last_done,
      updated_at = timezone('utc', now());

    insert into public.habit_completions (user_id, habit_id, completed_on)
    select
      h.user_id,
      h.id,
      completion_date::date
    from public.user_habits_state uhs
    cross join lateral jsonb_array_elements(uhs.habits) as habit_item
    join public.habits h
      on h.user_id = uhs.user_id
     and h.slug = habit_item->>'id'
    cross join lateral jsonb_array_elements_text(coalesce(habit_item->'doneDates', '[]'::jsonb)) as completion_date
    on conflict (habit_id, completed_on) do nothing;
  end if;
end $$;
