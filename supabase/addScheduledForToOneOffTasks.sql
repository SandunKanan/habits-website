alter table public.one_off_tasks
  add column if not exists scheduled_for date;

alter table public.one_off_tasks
  alter column completed_on drop not null;

update public.one_off_tasks
set scheduled_for = completed_on
where scheduled_for is null and completed_on is not null;
