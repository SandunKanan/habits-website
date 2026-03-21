begin;

update public.habits
set frequency_mode = 'rate'
where frequency_mode = 'quota';

alter table public.habits
  drop constraint if exists habits_frequency_mode_check;

alter table public.habits
  add constraint habits_frequency_mode_check
  check (frequency_mode in ('interval', 'rate'));

commit;
