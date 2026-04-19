alter table public.user_settings
  add column if not exists show_today_mantra boolean not null default false;

alter table public.user_settings
  add column if not exists today_mantra text not null default '';
