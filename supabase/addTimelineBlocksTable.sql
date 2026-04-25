create table if not exists public.timeline_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  lane_key text not null check (lane_key in ('location', 'main_focus', 'career', 'relationships', 'health', 'hobbies', 'financial')),
  start_month date not null,
  end_month date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_month >= start_month)
);

create index if not exists timeline_blocks_user_id_idx on public.timeline_blocks (user_id);

alter table public.timeline_blocks enable row level security;

drop policy if exists "Users can read own timeline blocks" on public.timeline_blocks;
create policy "Users can read own timeline blocks"
  on public.timeline_blocks
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own timeline blocks" on public.timeline_blocks;
create policy "Users can insert own timeline blocks"
  on public.timeline_blocks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own timeline blocks" on public.timeline_blocks;
create policy "Users can update own timeline blocks"
  on public.timeline_blocks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own timeline blocks" on public.timeline_blocks;
create policy "Users can delete own timeline blocks"
  on public.timeline_blocks
  for delete
  using (auth.uid() = user_id);
