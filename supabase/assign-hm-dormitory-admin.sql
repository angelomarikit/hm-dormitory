-- Assign an existing Auth user as HM Dormitory owner.
-- 1. Create the user first: Authentication → Users → Add user
-- 2. Replace the email below with that user's email
-- 3. Run this file

insert into public.site_members (
  site_id,
  user_id,
  role
)
select
  s.id,
  u.id,
  'owner'
from public.sites s
join auth.users u
  on lower(u.email) = lower('REPLACE_WITH_ADMIN_EMAIL@example.com')
where s.slug = 'hm-dormitory'
on conflict (site_id, user_id) do update
set role = excluded.role;

-- If this inserts 0 rows, either the email is wrong or the hm-dormitory site
-- does not exist yet. Run supabase/schema.sql first, then check Authentication → Users.
