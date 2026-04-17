alter table public.habits
  add column if not exists habit_display_mode text not null default 'scheduled';

alter table public.habits
  drop constraint if exists habits_habit_display_mode_check;

alter table public.habits
  add constraint habits_habit_display_mode_check
  check (habit_display_mode in ('daily', 'scheduled', 'optional'));
