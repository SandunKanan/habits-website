create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  items_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lists_user_id_idx on public.lists (user_id);

alter table public.lists enable row level security;

drop policy if exists "Users can read own lists" on public.lists;
create policy "Users can read own lists"
  on public.lists
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own lists" on public.lists;
create policy "Users can insert own lists"
  on public.lists
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own lists" on public.lists;
create policy "Users can update own lists"
  on public.lists
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own lists" on public.lists;
create policy "Users can delete own lists"
  on public.lists
  for delete
  using (auth.uid() = user_id);
