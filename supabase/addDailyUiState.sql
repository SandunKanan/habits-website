create table if not exists public.daily_ui_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  mantra_checked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, entry_date)
);

create index if not exists daily_ui_state_user_id_entry_date_idx
  on public.daily_ui_state (user_id, entry_date);

alter table public.daily_ui_state enable row level security;

drop policy if exists "Users can read own daily ui state" on public.daily_ui_state;
create policy "Users can read own daily ui state"
  on public.daily_ui_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily ui state" on public.daily_ui_state;
create policy "Users can insert own daily ui state"
  on public.daily_ui_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily ui state" on public.daily_ui_state;
create policy "Users can update own daily ui state"
  on public.daily_ui_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own daily ui state" on public.daily_ui_state;
create policy "Users can delete own daily ui state"
  on public.daily_ui_state
  for delete
  using (auth.uid() = user_id);
