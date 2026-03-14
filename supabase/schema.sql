create table if not exists public.habits_state (
  id text primary key,
  habits jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.habits_state enable row level security;

insert into public.habits_state (id, habits)
values ('default', '[]'::jsonb)
on conflict (id) do nothing;
