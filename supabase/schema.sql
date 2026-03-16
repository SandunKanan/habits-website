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

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists habits_user_id_idx on public.habits (user_id);
create index if not exists habit_completions_user_id_idx on public.habit_completions (user_id);
create index if not exists habit_completions_habit_id_idx on public.habit_completions (habit_id);

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, is_admin)
  values (new.id, new.email = 'sandunkanangama@gmail.com')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

insert into public.user_roles (user_id, is_admin)
select
  id,
  email = 'sandunkanangama@gmail.com'
from auth.users
on conflict (user_id) do update
set is_admin = public.user_roles.is_admin or excluded.is_admin;

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
  on public.user_roles
  for select
  using (auth.uid() = user_id);
