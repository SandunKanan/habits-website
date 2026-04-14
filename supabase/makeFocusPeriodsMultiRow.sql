alter table public.focus_periods
  add column if not exists id uuid default gen_random_uuid();

update public.focus_periods
set id = gen_random_uuid()
where id is null;

alter table public.focus_periods
  alter column id set not null;

alter table public.focus_periods
  drop constraint if exists focus_periods_pkey;

alter table public.focus_periods
  add constraint focus_periods_pkey primary key (id);
