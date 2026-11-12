-- Fix notices failing to load: RLS on notices queried notice_recipients,
-- which queried notices again (infinite recursion).
-- Run AFTER 007_comms.sql (and 009 if already applied). Safe to re-run.

create or replace function public.boarder_can_read_notice(p_notice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notice_recipients nr
    join public.tenants t on t.id = nr.tenant_id
    where nr.notice_id = p_notice_id
      and t.user_id = auth.uid()
  );
$$;

create or replace function public.notice_is_cms_managed(p_notice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notices n
    where n.id = p_notice_id
      and public.is_cms_staff(n.site_id)
  );
$$;

grant execute on function public.boarder_can_read_notice(uuid) to authenticated, anon;
grant execute on function public.notice_is_cms_managed(uuid) to authenticated, anon;

drop policy if exists "Staff manage notices" on public.notices;
create policy "Staff manage notices"
on public.notices for all to authenticated
using (public.is_cms_staff(site_id))
with check (public.is_cms_staff(site_id));

drop policy if exists "Ops read notices" on public.notices;
create policy "Ops read notices"
on public.notices for select to authenticated
using (public.is_ops_staff(site_id));

drop policy if exists "Boarders read published notices" on public.notices;
create policy "Boarders read published notices"
on public.notices for select to authenticated
using (
  published_at is not null
  and (expires_at is null or expires_at > timezone('utc', now()))
  and public.is_boarder_for_site(site_id)
  and (
    audience = 'all_boarders'
    or public.boarder_can_read_notice(id)
  )
);

drop policy if exists "Staff notice recipients" on public.notice_recipients;
create policy "Staff notice recipients"
on public.notice_recipients for all to authenticated
using (public.notice_is_cms_managed(notice_id))
with check (public.notice_is_cms_managed(notice_id));
