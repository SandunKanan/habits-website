alter table public.habits
  add column if not exists calendar_sync boolean not null default false;
