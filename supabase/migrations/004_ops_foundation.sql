-- =============================================================================
-- WAVE 1 — Operations foundation
-- Run AFTER 001, 002, and 003 in the Supabase SQL Editor.
-- Safe-ish to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Does NOT delete existing tenants, rooms, or CMS content.
--
-- HM Dormitory slug is 'hm-dormitory' (VITE_SITE_SLUG). Schema/RLS is
-- site_id-based (no hardcoded UUIDs). Data seed below only touches that slug.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Staff roles: add caretaker (CMS writes stay owner/admin/editor only)
-- -----------------------------------------------------------------------------

alter table public.site_members drop constraint if exists site_members_role_check;
alter table public.site_members
  add constraint site_members_role_check
  check (role in ('owner', 'admin', 'editor', 'caretaker'));

create or replace function public.is_cms_staff(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_site_id is not null
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.site_members
        where site_id = target_site_id
          and user_id = auth.uid()
          and role in ('owner', 'admin', 'editor')
      )
    );
$$;

create or replace function public.is_owner_or_admin(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_site_id is not null
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.site_members
        where site_id = target_site_id
          and user_id = auth.uid()
          and role in ('owner', 'admin')
      )
    );
$$;

create or replace function public.is_caretaker(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_members
    where site_id = target_site_id
      and user_id = auth.uid()
      and role = 'caretaker'
  );
$$;

create or replace function public.is_ops_staff(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_cms_staff(target_site_id) or public.is_caretaker(target_site_id);
$$;

grant execute on function public.is_cms_staff(uuid) to authenticated, anon;
grant execute on function public.is_owner_or_admin(uuid) to authenticated, anon;
grant execute on function public.is_caretaker(uuid) to authenticated, anon;
grant execute on function public.is_ops_staff(uuid) to authenticated, anon;

-- Tighten existing CMS write policies so caretakers cannot edit website copy
do $$
declare
  rec record;
begin
  for rec in
    select unnest(array[
      'announcements', 'floors', 'rooms', 'room_images', 'amenities',
      'rates', 'faqs', 'house_rules'
    ]) as tbl
  loop
    execute format('drop policy if exists "Members can insert %s" on public.%I', rec.tbl, rec.tbl);
    execute format('drop policy if exists "Members can update %s" on public.%I', rec.tbl, rec.tbl);
    execute format('drop policy if exists "Members can delete %s" on public.%I', rec.tbl, rec.tbl);
  end loop;
end;
$$;

drop policy if exists "Members can insert announcements" on public.announcements;
drop policy if exists "Members can update announcements" on public.announcements;
drop policy if exists "Members can delete announcements" on public.announcements;
create policy "Members can insert announcements" on public.announcements for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update announcements" on public.announcements for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Members can delete announcements" on public.announcements for delete to authenticated using (public.is_cms_staff(site_id));

drop policy if exists "Members can insert floors" on public.floors;
drop policy if exists "Members can update floors" on public.floors;
drop policy if exists "Members can delete floors" on public.floors;
create policy "Members can insert floors" on public.floors for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update floors" on public.floors for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Members can delete floors" on public.floors for delete to authenticated using (public.is_cms_staff(site_id));

drop policy if exists "Members can insert rooms" on public.rooms;
drop policy if exists "Members can update rooms" on public.rooms;
drop policy if exists "Members can delete rooms" on public.rooms;
create policy "Members can insert rooms" on public.rooms for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update rooms" on public.rooms for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Members can delete rooms" on public.rooms for delete to authenticated using (public.is_cms_staff(site_id));

drop policy if exists "Members can insert room images" on public.room_images;
drop policy if exists "Members can update room images" on public.room_images;
drop policy if exists "Members can delete room images" on public.room_images;
create policy "Members can insert room images" on public.room_images for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update room images" on public.room_images for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Members can delete room images" on public.room_images for delete to authenticated using (public.is_cms_staff(site_id));

drop policy if exists "Members can insert amenities" on public.amenities;
drop policy if exists "Members can update amenities" on public.amenities;
drop policy if exists "Members can delete amenities" on public.amenities;
create policy "Members can insert amenities" on public.amenities for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update amenities" on public.amenities for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Members can delete amenities" on public.amenities for delete to authenticated using (public.is_cms_staff(site_id));

drop policy if exists "Members can insert rates" on public.rates;
drop policy if exists "Members can update rates" on public.rates;
create policy "Members can insert rates" on public.rates for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update rates" on public.rates for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));

drop policy if exists "Members can insert faqs" on public.faqs;
drop policy if exists "Members can update faqs" on public.faqs;
drop policy if exists "Members can delete faqs" on public.faqs;
create policy "Members can insert faqs" on public.faqs for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update faqs" on public.faqs for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Members can delete faqs" on public.faqs for delete to authenticated using (public.is_cms_staff(site_id));

drop policy if exists "Members can insert house rules" on public.house_rules;
drop policy if exists "Members can update house rules" on public.house_rules;
drop policy if exists "Members can delete house rules" on public.house_rules;
create policy "Members can insert house rules" on public.house_rules for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Members can update house rules" on public.house_rules for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Members can delete house rules" on public.house_rules for delete to authenticated using (public.is_cms_staff(site_id));

drop policy if exists "Members can insert tenants" on public.tenants;
drop policy if exists "Members can update tenants" on public.tenants;
drop policy if exists "Members can delete tenants" on public.tenants;
drop policy if exists "Members can read tenants" on public.tenants;
create policy "Ops can read tenants" on public.tenants for select to authenticated using (public.is_ops_staff(site_id));
create policy "Cms can insert tenants" on public.tenants for insert to authenticated with check (public.is_cms_staff(site_id));
create policy "Cms can update tenants" on public.tenants for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));
create policy "Cms can delete tenants" on public.tenants for delete to authenticated using (public.is_owner_or_admin(site_id));

-- -----------------------------------------------------------------------------
-- Profiles (1:1 auth.users)
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auth_users_profile on auth.users;
create trigger trg_auth_users_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (user_id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Beds
-- -----------------------------------------------------------------------------

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  bed_code text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint beds_room_code_unique unique (room_id, bed_code)
);

create index if not exists idx_beds_site_id on public.beds (site_id);
create index if not exists idx_beds_room_id on public.beds (room_id);

insert into public.beds (site_id, room_id, bed_code, sort_order, is_active)
select
  r.site_id,
  r.id,
  r.room_number || '-' || lpad(gs.n::text, 2, '0'),
  gs.n,
  true
from public.rooms r
join public.sites s on s.id = r.site_id
cross join lateral generate_series(1, greatest(r.capacity, 0)) as gs(n)
where s.slug = 'hm-dormitory'
on conflict (room_id, bed_code) do nothing;

alter table public.beds enable row level security;
alter table public.beds force row level security;

drop policy if exists "Public can read active beds" on public.beds;
create policy "Public can read active beds"
on public.beds for select to anon, authenticated
using (
  public.is_ops_staff(site_id)
  or (
    is_active = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Cms can insert beds" on public.beds;
create policy "Cms can insert beds" on public.beds for insert to authenticated with check (public.is_cms_staff(site_id));
drop policy if exists "Cms can update beds" on public.beds;
create policy "Cms can update beds" on public.beds for update to authenticated using (public.is_cms_staff(site_id)) with check (public.is_cms_staff(site_id));

grant select on public.beds to anon, authenticated;
grant insert, update, delete on public.beds to authenticated;

-- -----------------------------------------------------------------------------
-- Tenants: bed assignment + optional login
-- -----------------------------------------------------------------------------

alter table public.tenants add column if not exists bed_id uuid references public.beds (id) on delete restrict;
alter table public.tenants add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.tenants add column if not exists email text;

create unique index if not exists idx_tenants_active_bed
  on public.tenants (bed_id)
  where is_active = true and bed_id is not null;

create unique index if not exists idx_tenants_active_user
  on public.tenants (site_id, user_id)
  where is_active = true and user_id is not null;

-- Place existing active tenants onto free beds in their room.
-- Pair tenant N in a room with free bed N so two people never get the same bed.
-- Extra tenants beyond room capacity stay without a bed_id.
with tenants_ranked as (
  select
    t.id as tenant_id,
    t.room_id,
    row_number() over (
      partition by t.room_id
      order by t.started_on, t.created_at, t.id
    ) as rn
  from public.tenants t
  join public.sites s on s.id = t.site_id
  where s.slug = 'hm-dormitory'
    and t.is_active = true
    and t.bed_id is null
),
beds_ranked as (
  select
    b.id as bed_id,
    b.room_id,
    row_number() over (
      partition by b.room_id
      order by b.sort_order, b.bed_code, b.id
    ) as rn
  from public.beds b
  join public.sites s on s.id = b.site_id
  where s.slug = 'hm-dormitory'
    and b.is_active = true
    and not exists (
      select 1 from public.tenants x
      where x.bed_id = b.id and x.is_active = true
    )
),
matched as (
  select tr.tenant_id, br.bed_id
  from tenants_ranked tr
  join beds_ranked br
    on br.room_id = tr.room_id
   and br.rn = tr.rn
)
update public.tenants t
set bed_id = matched.bed_id
from matched
where t.id = matched.tenant_id;

create or replace function public.enforce_tenant_bed_matches_room()
returns trigger
language plpgsql
as $$
declare
  bed_room uuid;
  bed_site uuid;
begin
  if new.bed_id is null then
    return new;
  end if;
  select room_id, site_id into bed_room, bed_site from public.beds where id = new.bed_id;
  if bed_room is null or bed_room <> new.room_id or bed_site <> new.site_id then
    raise exception 'Bed must belong to the assigned room.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tenants_bed_matches_room on public.tenants;
create trigger trg_tenants_bed_matches_room
before insert or update of bed_id, room_id, site_id on public.tenants
for each row execute function public.enforce_tenant_bed_matches_room();

-- -----------------------------------------------------------------------------
-- Boarder profiles
-- -----------------------------------------------------------------------------

create table if not exists public.boarder_profiles (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  tenant_id uuid unique references public.tenants (id) on delete set null,
  user_id uuid unique references auth.users (id) on delete set null,
  status text not null default 'pending',
  occupancy_type text,
  school_or_company text,
  date_of_birth date,
  gender text,
  nationality text,
  home_address text,
  emergency_name text,
  emergency_relationship text,
  emergency_phone text,
  monthly_rent_centavos integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint boarder_profiles_status_check check (status in ('pending', 'active', 'inactive', 'rejected'))
);

create index if not exists idx_boarder_profiles_site on public.boarder_profiles (site_id, status);
create index if not exists idx_boarder_profiles_user on public.boarder_profiles (user_id);

drop trigger if exists trg_boarder_profiles_updated_at on public.boarder_profiles;
create trigger trg_boarder_profiles_updated_at
before update on public.boarder_profiles
for each row execute function public.set_updated_at();

create or replace function public.is_boarder_for_site(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boarder_profiles
    where site_id = target_site_id
      and user_id = auth.uid()
      and status in ('pending', 'active')
  );
$$;

create or replace function public.current_boarder_id(target_site_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.boarder_profiles
  where site_id = target_site_id
    and user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.is_boarder_for_site(uuid) to authenticated, anon;
grant execute on function public.current_boarder_id(uuid) to authenticated, anon;

alter table public.boarder_profiles enable row level security;
alter table public.boarder_profiles force row level security;

drop policy if exists "Ops read boarder profiles" on public.boarder_profiles;
create policy "Ops read boarder profiles"
on public.boarder_profiles for select to authenticated
using (public.is_ops_staff(site_id) or user_id = auth.uid());

drop policy if exists "Cms write boarder profiles" on public.boarder_profiles;
create policy "Cms insert boarder profiles"
on public.boarder_profiles for insert to authenticated
with check (public.is_cms_staff(site_id) or user_id = auth.uid());

create policy "Cms update boarder profiles"
on public.boarder_profiles for update to authenticated
using (public.is_cms_staff(site_id) or user_id = auth.uid())
with check (public.is_cms_staff(site_id) or user_id = auth.uid());

grant select, insert, update on public.boarder_profiles to authenticated;

create policy "Boarder reads own tenant"
on public.tenants for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.boarder_profiles bp
    where bp.tenant_id = tenants.id and bp.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- Assignment history
-- -----------------------------------------------------------------------------

create table if not exists public.room_assignment_history (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete restrict,
  bed_id uuid references public.beds (id) on delete set null,
  started_on date not null,
  ended_on date,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_assignment_history_tenant on public.room_assignment_history (tenant_id, started_on desc);

alter table public.room_assignment_history enable row level security;
alter table public.room_assignment_history force row level security;

drop policy if exists "Ops read assignment history" on public.room_assignment_history;
create policy "Ops read assignment history"
on public.room_assignment_history for select to authenticated
using (
  public.is_ops_staff(site_id)
  or exists (
    select 1 from public.tenants t
    where t.id = tenant_id and t.user_id = auth.uid()
  )
);

create policy "Cms insert assignment history"
on public.room_assignment_history for insert to authenticated
with check (public.is_cms_staff(site_id));

grant select, insert, update on public.room_assignment_history to authenticated;

-- -----------------------------------------------------------------------------
-- Registrations
-- -----------------------------------------------------------------------------

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  reference_number text not null,
  status text not null default 'pending',
  full_name text not null,
  date_of_birth date,
  gender text,
  nationality text,
  home_address text,
  occupancy_type text,
  school_or_company text,
  email text not null,
  mobile text not null,
  emergency_name text,
  emergency_relationship text,
  emergency_phone text,
  preferred_room_type text,
  preferred_room_id uuid references public.rooms (id) on delete set null,
  preferred_move_in date,
  expected_stay text,
  special_requests text,
  terms_accepted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint registrations_status_check check (
    status in ('pending', 'under_review', 'approved', 'rejected', 'cancelled')
  ),
  constraint registrations_reference_unique unique (site_id, reference_number)
);

create index if not exists idx_registrations_site_status on public.registrations (site_id, status, created_at desc);
create index if not exists idx_registrations_email on public.registrations (site_id, lower(email));

drop trigger if exists trg_registrations_updated_at on public.registrations;
create trigger trg_registrations_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

create table if not exists public.registration_documents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  registration_id uuid not null references public.registrations (id) on delete cascade,
  document_type text not null default 'valid_id',
  storage_path text not null,
  original_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.registration_status_history (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create sequence if not exists public.registration_ref_seq;

create or replace function public.next_registration_reference(target_site_id uuid)
returns text
language plpgsql
as $$
declare
  n bigint;
  y text;
begin
  n := nextval('public.registration_ref_seq');
  y := to_char(timezone('Asia/Manila', now()), 'YYYY');
  return 'HMD-' || y || '-' || lpad(n::text, 5, '0');
end;
$$;

grant execute on function public.next_registration_reference(uuid) to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  audience text not null default 'staff',
  title text not null,
  body text,
  link_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);

create or replace function public.notify_staff_new_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (site_id, user_id, audience, title, body, link_path)
  select
    new.site_id,
    sm.user_id,
    'staff',
    'New registration',
    new.full_name || ' submitted ' || new.reference_number,
    '/admin/registrations'
  from public.site_members sm
  where sm.site_id = new.site_id
    and sm.role in ('owner', 'admin', 'editor');
  return new;
end;
$$;

drop trigger if exists trg_registrations_notify on public.registrations;
create trigger trg_registrations_notify
after insert on public.registrations
for each row execute function public.notify_staff_new_registration();

alter table public.registrations enable row level security;
alter table public.registrations force row level security;
alter table public.registration_documents enable row level security;
alter table public.registration_documents force row level security;
alter table public.registration_status_history enable row level security;
alter table public.registration_status_history force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists "Own or staff read registrations" on public.registrations;
create policy "Own or staff read registrations"
on public.registrations for select to authenticated
using (public.is_cms_staff(site_id) or user_id = auth.uid());

create policy "Applicant insert registration"
on public.registrations for insert to authenticated
with check (user_id = auth.uid());

create policy "Applicant update own pending"
on public.registrations for update to authenticated
using (user_id = auth.uid() and status in ('pending', 'cancelled'))
with check (user_id = auth.uid());

create policy "Staff update registrations"
on public.registrations for update to authenticated
using (public.is_cms_staff(site_id))
with check (public.is_cms_staff(site_id));

create policy "Staff or owner read documents"
on public.registration_documents for select to authenticated
using (
  public.is_cms_staff(site_id)
  or exists (
    select 1 from public.registrations r
    where r.id = registration_id and r.user_id = auth.uid()
  )
);

create policy "Applicant insert documents"
on public.registration_documents for insert to authenticated
with check (
  exists (
    select 1 from public.registrations r
    where r.id = registration_id and r.user_id = auth.uid() and r.site_id = site_id
  )
);

create policy "Staff read status history"
on public.registration_status_history for select to authenticated
using (
  exists (
    select 1 from public.registrations r
    where r.id = registration_id
      and (public.is_cms_staff(r.site_id) or r.user_id = auth.uid())
  )
);

create policy "Staff insert status history"
on public.registration_status_history for insert to authenticated
with check (
  exists (
    select 1 from public.registrations r
    where r.id = registration_id and public.is_cms_staff(r.site_id)
  )
);

create policy "Users read own notifications"
on public.notifications for select to authenticated
using (user_id = auth.uid() or (user_id is null and public.is_cms_staff(site_id)));

create policy "Users update own notifications"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on public.registrations to authenticated;
grant select, insert on public.registration_documents to authenticated;
grant select, insert on public.registration_status_history to authenticated;
grant select, update on public.notifications to authenticated;

create or replace function public.lookup_registration_status(p_reference text, p_email text)
returns table (
  reference_number text,
  status text,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.reference_number, r.status, r.created_at
  from public.registrations r
  where r.reference_number = upper(trim(p_reference))
    and lower(r.email) = lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.lookup_registration_status(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Private storage buckets
-- Path: {site_id}/registrations|receipts|boarders/...
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'registration-documents',
    'registration-documents',
    false,
    10485760,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'payment-receipts',
    'payment-receipts',
    false,
    10485760,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'boarder-documents',
    'boarder-documents',
    false,
    10485760,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Staff read registration docs" on storage.objects;
create policy "Staff read registration docs"
on storage.objects for select to authenticated
using (
  bucket_id = 'registration-documents'
  and public.is_cms_staff(public.storage_site_id(name))
);

drop policy if exists "Applicant read own registration docs" on storage.objects;
create policy "Applicant read own registration docs"
on storage.objects for select to authenticated
using (
  bucket_id = 'registration-documents'
  and (storage.foldername(name))[1] = (
    select site_id::text from public.registrations where user_id = auth.uid() limit 1
  )
);

drop policy if exists "Applicant upload registration docs" on storage.objects;
create policy "Applicant upload registration docs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'registration-documents'
  and public.storage_site_id(name) is not null
  and (
    public.is_cms_staff(public.storage_site_id(name))
    or public.is_boarder_for_site(public.storage_site_id(name))
    or exists (
      select 1 from public.registrations r
      where r.user_id = auth.uid()
        and r.site_id = public.storage_site_id(name)
    )
  )
);

drop policy if exists "Staff payment receipts" on storage.objects;
create policy "Staff payment receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    public.is_ops_staff(public.storage_site_id(name))
    or public.is_boarder_for_site(public.storage_site_id(name))
  )
);

drop policy if exists "Boarder upload receipts" on storage.objects;
create policy "Boarder upload receipts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (
    public.is_ops_staff(public.storage_site_id(name))
    or public.is_boarder_for_site(public.storage_site_id(name))
  )
);

drop policy if exists "Boarder documents access" on storage.objects;
create policy "Boarder documents access"
on storage.objects for select to authenticated
using (
  bucket_id = 'boarder-documents'
  and (
    public.is_cms_staff(public.storage_site_id(name))
    or public.is_boarder_for_site(public.storage_site_id(name))
  )
);

drop policy if exists "Boarder documents upload" on storage.objects;
create policy "Boarder documents upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'boarder-documents'
  and (
    public.is_cms_staff(public.storage_site_id(name))
    or public.is_boarder_for_site(public.storage_site_id(name))
  )
);
