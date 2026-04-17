create extension if not exists pgcrypto;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  habit_display_mode text not null default 'scheduled' check (habit_display_mode in ('daily', 'scheduled', 'optional')),
  frequency_mode text not null check (frequency_mode in ('interval', 'rate')),
  frequency_value integer not null check (frequency_value >= 1),
  frequency_unit text not null check (frequency_unit in ('day', 'week', 'month')),
  importance integer not null check (importance >= 0 and importance <= 10),
  domain_ids_json jsonb not null default '[]'::jsonb,
  cycle_skip_dates_json jsonb not null default '[]'::jsonb,
  subtasks jsonb not null default '[]'::jsonb,
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

create table if not exists public.habit_skips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  skipped_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (habit_id, skipped_on)
);

create table if not exists public.attributes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  decay_rate numeric not null default 0 check (decay_rate >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slug)
);

create table if not exists public.habit_attribute_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  weight numeric not null check (weight > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (habit_id, attribute_id)
);

create table if not exists public.visions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ideal_self text not null default '',
  ideal_life text not null default '',
  current_season text not null default '',
  season_intention text not null default '',
  focus_view_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vision_focus_attributes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, attribute_id)
);

create table if not exists public.focus_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  start_date date,
  end_date date,
  why_now text not null default '',
  end_state text not null default '',
  current_obstacles text not null default '',
  focus_domain_ids_json jsonb not null default '[]'::jsonb,
  focus_targets_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  parent_id uuid references public.domains (id) on delete cascade,
  notes text not null default '',
  score_out_of_ten numeric check (score_out_of_ten >= 0 and score_out_of_ten <= 10),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slug)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  title text not null,
  timeframe_type text not null check (timeframe_type in ('long_term', 'fixed_timeframe')),
  target_date date,
  notes text not null default '',
  domain_ids_json jsonb not null default '[]'::jsonb,
  subgoals_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slug)
);

create table if not exists public.learning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  title text not null,
  item_type text not null check (item_type in ('learning', 'course', 'project')),
  priority integer not null default 3 check (priority >= 1 and priority <= 5),
  status text not null default 'idea' check (status in ('idea', 'active', 'paused', 'completed')),
  notes text not null default '',
  domain_ids_json jsonb not null default '[]'::jsonb,
  pursuit_targets_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slug)
);

create table if not exists public.one_off_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  scheduled_for date,
  completed_on date,
  attribute_links_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.track_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  unit text not null,
  target_value numeric,
  entry_mode text not null default 'single_value' check (entry_mode in ('single_value', 'structured_log')),
  fields_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slug)
);

create table if not exists public.track_metric_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric_id uuid not null references public.track_metrics (id) on delete cascade,
  entry_date date not null,
  value numeric check (value >= 0),
  value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  mode text not null default 'text' check (mode in ('text', 'bullet_list')),
  body text not null,
  bullet_items_json jsonb not null default '[]'::jsonb,
  tags_json jsonb not null default '[]'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  items_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  highlight_focus_attributes boolean not null default true,
  use_attribute_decay boolean not null default true,
  use_decimal_domain_scores boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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
create index if not exists habit_skips_user_id_idx on public.habit_skips (user_id);
create index if not exists habit_skips_habit_id_idx on public.habit_skips (habit_id);
create index if not exists attributes_user_id_idx on public.attributes (user_id);
create index if not exists habit_attribute_links_user_id_idx on public.habit_attribute_links (user_id);
create index if not exists habit_attribute_links_habit_id_idx on public.habit_attribute_links (habit_id);
create index if not exists habit_attribute_links_attribute_id_idx on public.habit_attribute_links (attribute_id);
create index if not exists visions_user_id_idx on public.visions (user_id);
create index if not exists vision_focus_attributes_user_id_idx on public.vision_focus_attributes (user_id);
create index if not exists vision_focus_attributes_attribute_id_idx on public.vision_focus_attributes (attribute_id);
create index if not exists focus_periods_user_id_idx on public.focus_periods (user_id);
create index if not exists domains_user_id_idx on public.domains (user_id);
create index if not exists domains_parent_id_idx on public.domains (parent_id);
create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists learning_items_user_id_idx on public.learning_items (user_id);
create index if not exists one_off_tasks_user_id_idx on public.one_off_tasks (user_id);
create index if not exists track_metrics_user_id_idx on public.track_metrics (user_id);
create index if not exists track_metric_entries_user_id_idx on public.track_metric_entries (user_id);
create index if not exists track_metric_entries_metric_id_idx on public.track_metric_entries (metric_id);
create index if not exists track_metric_entries_entry_date_idx on public.track_metric_entries (entry_date);
create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists lists_user_id_idx on public.lists (user_id);
create index if not exists journal_entries_user_id_idx on public.journal_entries (user_id);
create index if not exists user_settings_user_id_idx on public.user_settings (user_id);

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.habit_skips enable row level security;
alter table public.attributes enable row level security;
alter table public.habit_attribute_links enable row level security;
alter table public.visions enable row level security;
alter table public.vision_focus_attributes enable row level security;
alter table public.focus_periods enable row level security;
alter table public.domains enable row level security;
alter table public.goals enable row level security;
alter table public.learning_items enable row level security;
alter table public.one_off_tasks enable row level security;
alter table public.track_metrics enable row level security;
alter table public.track_metric_entries enable row level security;
alter table public.notes enable row level security;
alter table public.lists enable row level security;
alter table public.journal_entries enable row level security;
alter table public.user_settings enable row level security;
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

drop policy if exists "Users can read own attributes" on public.attributes;
create policy "Users can read own attributes"
  on public.attributes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own attributes" on public.attributes;
create policy "Users can insert own attributes"
  on public.attributes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own attributes" on public.attributes;
create policy "Users can update own attributes"
  on public.attributes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own attributes" on public.attributes;
create policy "Users can delete own attributes"
  on public.attributes
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own habit attribute links" on public.habit_attribute_links;
create policy "Users can read own habit attribute links"
  on public.habit_attribute_links
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own vision" on public.visions;
create policy "Users can read own vision"
  on public.visions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own vision focus attributes" on public.vision_focus_attributes;
create policy "Users can read own vision focus attributes"
  on public.vision_focus_attributes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own focus period" on public.focus_periods;
create policy "Users can read own focus period"
  on public.focus_periods
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own domains" on public.domains;
create policy "Users can read own domains"
  on public.domains
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own goals" on public.goals;
create policy "Users can read own goals"
  on public.goals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own lists" on public.lists;
create policy "Users can read own lists"
  on public.lists
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own journal entries" on public.journal_entries;
create policy "Users can read own journal entries"
  on public.journal_entries
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own lists" on public.lists;
create policy "Users can insert own lists"
  on public.lists
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own journal entries" on public.journal_entries;
create policy "Users can insert own journal entries"
  on public.journal_entries
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own lists" on public.lists;
create policy "Users can update own lists"
  on public.lists
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own journal entries" on public.journal_entries;
create policy "Users can update own journal entries"
  on public.journal_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own lists" on public.lists;
create policy "Users can delete own lists"
  on public.lists
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own journal entries" on public.journal_entries;
create policy "Users can delete own journal entries"
  on public.journal_entries
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own learning items" on public.learning_items;
create policy "Users can read own learning items"
  on public.learning_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own one-off tasks" on public.one_off_tasks;
create policy "Users can read own one-off tasks"
  on public.one_off_tasks
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own track metrics" on public.track_metrics;
create policy "Users can read own track metrics"
  on public.track_metrics
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own track metric entries" on public.track_metric_entries;
create policy "Users can read own track metric entries"
  on public.track_metric_entries
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
  on public.user_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own vision" on public.visions;
create policy "Users can insert own vision"
  on public.visions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own vision focus attributes" on public.vision_focus_attributes;
create policy "Users can insert own vision focus attributes"
  on public.vision_focus_attributes
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.attributes
      where public.attributes.id = attribute_id
        and public.attributes.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own focus period" on public.focus_periods;
create policy "Users can insert own focus period"
  on public.focus_periods
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own domains" on public.domains;
create policy "Users can insert own domains"
  on public.domains
  for insert
  with check (
    auth.uid() = user_id
    and (
      parent_id is null
      or exists (
        select 1
        from public.domains as parent_domain
        where parent_domain.id = public.domains.parent_id
          and parent_domain.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals"
  on public.goals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own learning items" on public.learning_items;
create policy "Users can insert own learning items"
  on public.learning_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own one-off tasks" on public.one_off_tasks;
create policy "Users can insert own one-off tasks"
  on public.one_off_tasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own track metrics" on public.track_metrics;
create policy "Users can insert own track metrics"
  on public.track_metrics
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own track metric entries" on public.track_metric_entries;
create policy "Users can insert own track metric entries"
  on public.track_metric_entries
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.track_metrics
      where public.track_metrics.id = metric_id
        and public.track_metrics.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own vision" on public.visions;
create policy "Users can update own vision"
  on public.visions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own vision focus attributes" on public.vision_focus_attributes;
create policy "Users can update own vision focus attributes"
  on public.vision_focus_attributes
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.attributes
      where public.attributes.id = attribute_id
        and public.attributes.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own focus period" on public.focus_periods;
create policy "Users can update own focus period"
  on public.focus_periods
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own domains" on public.domains;
create policy "Users can update own domains"
  on public.domains
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      parent_id is null
      or exists (
        select 1
        from public.domains as parent_domain
        where parent_domain.id = public.domains.parent_id
          and parent_domain.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
  on public.goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own learning items" on public.learning_items;
create policy "Users can update own learning items"
  on public.learning_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own one-off tasks" on public.one_off_tasks;
create policy "Users can update own one-off tasks"
  on public.one_off_tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own track metrics" on public.track_metrics;
create policy "Users can update own track metrics"
  on public.track_metrics
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own track metric entries" on public.track_metric_entries;
create policy "Users can update own track metric entries"
  on public.track_metric_entries
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.track_metrics
      where public.track_metrics.id = metric_id
        and public.track_metrics.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own vision" on public.visions;
create policy "Users can delete own vision"
  on public.visions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own vision focus attributes" on public.vision_focus_attributes;
create policy "Users can delete own vision focus attributes"
  on public.vision_focus_attributes
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own focus period" on public.focus_periods;
create policy "Users can delete own focus period"
  on public.focus_periods
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own domains" on public.domains;
create policy "Users can delete own domains"
  on public.domains
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals"
  on public.goals
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own learning items" on public.learning_items;
create policy "Users can delete own learning items"
  on public.learning_items
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own one-off tasks" on public.one_off_tasks;
create policy "Users can delete own one-off tasks"
  on public.one_off_tasks
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own track metrics" on public.track_metrics;
create policy "Users can delete own track metrics"
  on public.track_metrics
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own track metric entries" on public.track_metric_entries;
create policy "Users can delete own track metric entries"
  on public.track_metric_entries
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own settings" on public.user_settings;
create policy "Users can delete own settings"
  on public.user_settings
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own habit attribute links" on public.habit_attribute_links;
create policy "Users can insert own habit attribute links"
  on public.habit_attribute_links
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.habits
      where public.habits.id = habit_id
        and public.habits.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.attributes
      where public.attributes.id = attribute_id
        and public.attributes.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own habit attribute links" on public.habit_attribute_links;
create policy "Users can update own habit attribute links"
  on public.habit_attribute_links
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
    and exists (
      select 1
      from public.attributes
      where public.attributes.id = attribute_id
        and public.attributes.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own habit attribute links" on public.habit_attribute_links;
create policy "Users can delete own habit attribute links"
  on public.habit_attribute_links
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own skips" on public.habit_skips;
create policy "Users can read own skips"
  on public.habit_skips
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own skips" on public.habit_skips;
create policy "Users can insert own skips"
  on public.habit_skips
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

drop policy if exists "Users can update own skips" on public.habit_skips;
create policy "Users can update own skips"
  on public.habit_skips
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

drop policy if exists "Users can delete own skips" on public.habit_skips;
create policy "Users can delete own skips"
  on public.habit_skips
  for delete
  using (auth.uid() = user_id);
