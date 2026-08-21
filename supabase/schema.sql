-- =============================================================================
-- Apex Technology — Multi-tenant landing page schema
-- Safe to run on a new Supabase project. Re-runnable with IF NOT EXISTS / DROP IF EXISTS.
-- HM Dormitory is the first tenant (slug: hm-dormitory).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Core multi-tenant tables
-- -----------------------------------------------------------------------------

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  hero_image_url text,
  building_image_url text,
  short_description text,
  hero_heading text,
  hero_subheading text,
  address text,
  phone text,
  email text,
  facebook_url text,
  messenger_url text,
  registration_url text,
  google_maps_embed_url text,
  google_maps_directions_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sites_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.site_members (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default timezone('utc', now()),
  constraint site_members_role_check check (role in ('owner', 'admin', 'editor')),
  constraint site_members_site_user_unique unique (site_id, user_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  title text not null,
  content text not null,
  is_important boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  name text not null,
  floor_number integer not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint floors_site_floor_number_unique unique (site_id, floor_number)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  floor_id uuid not null references public.floors (id) on delete restrict,
  room_number text not null,
  room_name text,
  description text,
  capacity integer not null default 0,
  occupied_spaces integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rooms_capacity_non_negative check (capacity >= 0),
  constraint rooms_occupied_non_negative check (occupied_spaces >= 0),
  constraint rooms_occupied_within_capacity check (occupied_spaces <= capacity),
  constraint rooms_site_room_number_unique unique (site_id, room_number)
);

create table if not exists public.room_images (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rates (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  monthly_rate text,
  monthly_rate_label text,
  electricity_information text,
  water_information text,
  other_fees text,
  deposit_information text,
  additional_notes text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rates_one_per_site unique (site_id)
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.house_rules (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  title text,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_site_members_site_id on public.site_members (site_id);
create index if not exists idx_site_members_user_id on public.site_members (user_id);
create index if not exists idx_announcements_site_id on public.announcements (site_id);
create index if not exists idx_announcements_published on public.announcements (site_id, is_published, is_important);
create index if not exists idx_floors_site_id on public.floors (site_id, sort_order);
create index if not exists idx_rooms_site_id on public.rooms (site_id, sort_order);
create index if not exists idx_rooms_floor_id on public.rooms (floor_id);
create index if not exists idx_room_images_room_id on public.room_images (room_id, sort_order);
create index if not exists idx_room_images_site_id on public.room_images (site_id);
create index if not exists idx_amenities_site_id on public.amenities (site_id, sort_order);
create index if not exists idx_faqs_site_id on public.faqs (site_id, sort_order);
create index if not exists idx_house_rules_site_id on public.house_rules (site_id, sort_order);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

drop trigger if exists trg_sites_updated_at on public.sites;
create trigger trg_sites_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

drop trigger if exists trg_floors_updated_at on public.floors;
create trigger trg_floors_updated_at
before update on public.floors
for each row execute function public.set_updated_at();

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists trg_amenities_updated_at on public.amenities;
create trigger trg_amenities_updated_at
before update on public.amenities
for each row execute function public.set_updated_at();

drop trigger if exists trg_rates_updated_at on public.rates;
create trigger trg_rates_updated_at
before update on public.rates
for each row execute function public.set_updated_at();

drop trigger if exists trg_faqs_updated_at on public.faqs;
create trigger trg_faqs_updated_at
before update on public.faqs
for each row execute function public.set_updated_at();

drop trigger if exists trg_house_rules_updated_at on public.house_rules;
create trigger trg_house_rules_updated_at
before update on public.house_rules
for each row execute function public.set_updated_at();

-- Keep rooms.site_id aligned with the floor's site.
create or replace function public.enforce_room_site_matches_floor()
returns trigger
language plpgsql
as $$
declare
  floor_site uuid;
begin
  select site_id into floor_site from public.floors where id = new.floor_id;
  if floor_site is null or floor_site <> new.site_id then
    raise exception 'Room site_id must match the selected floor site_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rooms_site_matches_floor on public.rooms;
create trigger trg_rooms_site_matches_floor
before insert or update of floor_id, site_id on public.rooms
for each row execute function public.enforce_room_site_matches_floor();

create or replace function public.enforce_room_image_site()
returns trigger
language plpgsql
as $$
declare
  room_site uuid;
begin
  select site_id into room_site from public.rooms where id = new.room_id;
  if room_site is null or room_site <> new.site_id then
    raise exception 'Room image site_id must match the parent room site_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_room_images_site on public.room_images;
create trigger trg_room_images_site
before insert or update of room_id, site_id on public.room_images
for each row execute function public.enforce_room_image_site();

-- -----------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER to avoid RLS recursion)
-- -----------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_site_member(target_site_id uuid)
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
      )
    );
$$;

create or replace function public.storage_site_id(object_name text)
returns uuid
language plpgsql
stable
as $$
declare
  folder text;
begin
  folder := (storage.foldername(object_name))[1];
  return folder::uuid;
exception
  when others then
    return null;
end;
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_site_member(uuid) from public;
revoke all on function public.storage_site_id(text) from public;

grant execute on function public.is_platform_admin() to authenticated, anon;
grant execute on function public.is_site_member(uuid) to authenticated, anon;
grant execute on function public.storage_site_id(text) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.sites enable row level security;
alter table public.platform_admins enable row level security;
alter table public.site_members enable row level security;
alter table public.announcements enable row level security;
alter table public.floors enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.amenities enable row level security;
alter table public.rates enable row level security;
alter table public.faqs enable row level security;
alter table public.house_rules enable row level security;

-- Force RLS so table owners in the dashboard still respect policies when using the anon/authenticated roles.
alter table public.sites force row level security;
alter table public.platform_admins force row level security;
alter table public.site_members force row level security;
alter table public.announcements force row level security;
alter table public.floors force row level security;
alter table public.rooms force row level security;
alter table public.room_images force row level security;
alter table public.amenities force row level security;
alter table public.rates force row level security;
alter table public.faqs force row level security;
alter table public.house_rules force row level security;

-- Sites
drop policy if exists "Public can read active sites" on public.sites;
create policy "Public can read active sites"
on public.sites
for select
to anon, authenticated
using (is_active = true or public.is_site_member(id));

drop policy if exists "Members can update their site" on public.sites;
create policy "Members can update their site"
on public.sites
for update
to authenticated
using (public.is_site_member(id))
with check (public.is_site_member(id));

-- Platform admins: users can only see their own row. Writes are done in the SQL editor.
drop policy if exists "Platform admins can read self" on public.platform_admins;
create policy "Platform admins can read self"
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

-- Site members: users can read their own memberships. Assignments are done in SQL.
drop policy if exists "Users can read own memberships" on public.site_members;
create policy "Users can read own memberships"
on public.site_members
for select
to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

-- Announcements
drop policy if exists "Public can read published announcements" on public.announcements;
create policy "Public can read published announcements"
on public.announcements
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_published = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert announcements" on public.announcements;
create policy "Members can insert announcements"
on public.announcements
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update announcements" on public.announcements;
create policy "Members can update announcements"
on public.announcements
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete announcements" on public.announcements;
create policy "Members can delete announcements"
on public.announcements
for delete
to authenticated
using (public.is_site_member(site_id));

-- Floors
drop policy if exists "Public can read active floors" on public.floors;
create policy "Public can read active floors"
on public.floors
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_active = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert floors" on public.floors;
create policy "Members can insert floors"
on public.floors
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update floors" on public.floors;
create policy "Members can update floors"
on public.floors
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete floors" on public.floors;
create policy "Members can delete floors"
on public.floors
for delete
to authenticated
using (public.is_site_member(site_id));

-- Rooms
drop policy if exists "Public can read active rooms" on public.rooms;
create policy "Public can read active rooms"
on public.rooms
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_active = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert rooms" on public.rooms;
create policy "Members can insert rooms"
on public.rooms
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update rooms" on public.rooms;
create policy "Members can update rooms"
on public.rooms
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete rooms" on public.rooms;
create policy "Members can delete rooms"
on public.rooms
for delete
to authenticated
using (public.is_site_member(site_id));

-- Room images
drop policy if exists "Public can read room images" on public.room_images;
create policy "Public can read room images"
on public.room_images
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or exists (
    select 1
    from public.rooms r
    join public.sites s on s.id = r.site_id
    where r.id = room_images.room_id
      and r.is_active = true
      and s.is_active = true
  )
);

drop policy if exists "Members can insert room images" on public.room_images;
create policy "Members can insert room images"
on public.room_images
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update room images" on public.room_images;
create policy "Members can update room images"
on public.room_images
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete room images" on public.room_images;
create policy "Members can delete room images"
on public.room_images
for delete
to authenticated
using (public.is_site_member(site_id));

-- Amenities
drop policy if exists "Public can read active amenities" on public.amenities;
create policy "Public can read active amenities"
on public.amenities
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_active = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert amenities" on public.amenities;
create policy "Members can insert amenities"
on public.amenities
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update amenities" on public.amenities;
create policy "Members can update amenities"
on public.amenities
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete amenities" on public.amenities;
create policy "Members can delete amenities"
on public.amenities
for delete
to authenticated
using (public.is_site_member(site_id));

-- Rates
drop policy if exists "Public can read rates" on public.rates;
create policy "Public can read rates"
on public.rates
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
);

drop policy if exists "Members can insert rates" on public.rates;
create policy "Members can insert rates"
on public.rates
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update rates" on public.rates;
create policy "Members can update rates"
on public.rates
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete rates" on public.rates;
create policy "Members can delete rates"
on public.rates
for delete
to authenticated
using (public.is_site_member(site_id));

-- FAQs
drop policy if exists "Public can read active faqs" on public.faqs;
create policy "Public can read active faqs"
on public.faqs
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_active = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert faqs" on public.faqs;
create policy "Members can insert faqs"
on public.faqs
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update faqs" on public.faqs;
create policy "Members can update faqs"
on public.faqs
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete faqs" on public.faqs;
create policy "Members can delete faqs"
on public.faqs
for delete
to authenticated
using (public.is_site_member(site_id));

-- House rules
drop policy if exists "Public can read active house rules" on public.house_rules;
create policy "Public can read active house rules"
on public.house_rules
for select
to anon, authenticated
using (
  public.is_site_member(site_id)
  or (
    is_active = true
    and exists (select 1 from public.sites s where s.id = site_id and s.is_active = true)
  )
);

drop policy if exists "Members can insert house rules" on public.house_rules;
create policy "Members can insert house rules"
on public.house_rules
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update house rules" on public.house_rules;
create policy "Members can update house rules"
on public.house_rules
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete house rules" on public.house_rules;
create policy "Members can delete house rules"
on public.house_rules
for delete
to authenticated
using (public.is_site_member(site_id));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.sites to anon, authenticated;
grant update on public.sites to authenticated;

grant select on public.platform_admins to authenticated;

grant select on public.site_members to authenticated;

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

grant select on public.floors to anon, authenticated;
grant insert, update, delete on public.floors to authenticated;

grant select on public.rooms to anon, authenticated;
grant insert, update, delete on public.rooms to authenticated;

grant select on public.room_images to anon, authenticated;
grant insert, update, delete on public.room_images to authenticated;

grant select on public.amenities to anon, authenticated;
grant insert, update, delete on public.amenities to authenticated;

grant select on public.rates to anon, authenticated;
grant insert, update, delete on public.rates to authenticated;

grant select on public.faqs to anon, authenticated;
grant insert, update, delete on public.faqs to authenticated;

grant select on public.house_rules to anon, authenticated;
grant insert, update, delete on public.house_rules to authenticated;

-- -----------------------------------------------------------------------------
-- Storage bucket and policies
-- Path pattern: {site_id}/logo|hero|building|rooms/{room_id}|amenities/...
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site assets" on storage.objects;
create policy "Public can view site assets"
on storage.objects
for select
to public
using (bucket_id = 'site-assets');

drop policy if exists "Members can upload site assets" on storage.objects;
create policy "Members can upload site assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-assets'
  and public.is_site_member(public.storage_site_id(name))
);

drop policy if exists "Members can update site assets" on storage.objects;
create policy "Members can update site assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-assets'
  and public.is_site_member(public.storage_site_id(name))
)
with check (
  bucket_id = 'site-assets'
  and public.is_site_member(public.storage_site_id(name))
);

drop policy if exists "Members can delete site assets" on storage.objects;
create policy "Members can delete site assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-assets'
  and public.is_site_member(public.storage_site_id(name))
);

-- -----------------------------------------------------------------------------
-- HM Dormitory seed (placeholders only — no invented official details)
-- -----------------------------------------------------------------------------

insert into public.sites (
  name,
  slug,
  short_description,
  hero_heading,
  hero_subheading,
  is_active
)
values (
  'HM Dormitory',
  'hm-dormitory',
  'Comfortable boarding rooms in a well-kept residential setting.',
  'A quiet place to stay.',
  'See available rooms, bed spaces, and boarding information.',
  true
)
on conflict (slug) do nothing;

insert into public.floors (site_id, name, floor_number, description, sort_order, is_active)
select s.id, f.name, f.floor_number, f.description, f.sort_order, true
from public.sites s
cross join (
  values
    ('Ground Floor', 1, 'Ground-level rooms.', 1),
    ('Second Floor', 2, 'Second-floor rooms.', 2),
    ('Third Floor', 3, 'Third-floor rooms.', 3)
) as f(name, floor_number, description, sort_order)
where s.slug = 'hm-dormitory'
on conflict (site_id, floor_number) do nothing;

insert into public.rates (site_id)
select id from public.sites where slug = 'hm-dormitory'
on conflict (site_id) do nothing;
