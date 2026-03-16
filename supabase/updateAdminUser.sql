-- Promote a user to admin
-- Replace the email before running.
insert into public.user_roles (user_id, is_admin)
select id, true
from auth.users
where email = 'user@example.com'
on conflict (user_id) do update
set is_admin = true;

-- Demote a user from admin
-- Replace the email before running.
update public.user_roles
set is_admin = false
where user_id in (
  select id
  from auth.users
  where email = 'user@example.com'
);
