-- =============================================================================
-- Tenants + standardized HM Dormitory rooms
-- Run this in the Supabase SQL Editor after the initial schema.
-- Safe to re-run.
-- =============================================================================

alter table public.rooms
  add column if not exists room_type text;

alter table public.rooms
  drop constraint if exists rooms_room_type_check;

alter table public.rooms
  add constraint rooms_room_type_check
  check (room_type is null or room_type in ('big', 'small'));

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete restrict,
  full_name text not null,
  phone text,
  notes text,
  started_on date not null default (timezone('utc', now()))::date,
  left_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenants_name_not_blank check (length(trim(full_name)) > 0),
  constraint tenants_left_on_after_start check (left_on is null or left_on >= started_on),
  constraint tenants_left_matches_status check (
    (is_active = true and left_on is null)
    or (is_active = false and left_on is not null)
  )
);

create index if not exists idx_tenants_site_id on public.tenants (site_id, is_active);
create index if not exists idx_tenants_room_id on public.tenants (room_id, is_active);

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create or replace function public.enforce_tenant_site_matches_room()
returns trigger
language plpgsql
as $$
declare
  room_site uuid;
begin
  select site_id into room_site from public.rooms where id = new.room_id;
  if room_site is null or room_site <> new.site_id then
    raise exception 'Tenant site_id must match the assigned room site_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tenants_site_matches_room on public.tenants;
create trigger trg_tenants_site_matches_room
before insert or update of room_id, site_id on public.tenants
for each row execute function public.enforce_tenant_site_matches_room();

create or replace function public.refresh_room_occupied_spaces(target_room_id uuid)
returns void
language plpgsql
as $$
declare
  next_occupied integer;
begin
  select count(*)::int
  into next_occupied
  from public.tenants
  where room_id = target_room_id
    and is_active = true;

  update public.rooms
  set occupied_spaces = next_occupied
  where id = target_room_id;
end;
$$;

create or replace function public.tenants_enforce_capacity()
returns trigger
language plpgsql
as $$
declare
  cap integer;
  occupied integer;
begin
  if new.is_active is not true then
    return new;
  end if;

  select capacity into cap from public.rooms where id = new.room_id;

  select count(*)::int
  into occupied
  from public.tenants
  where room_id = new.room_id
    and is_active = true
    and id is distinct from new.id;

  if occupied >= cap then
    raise exception 'This room is already full.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tenants_enforce_capacity on public.tenants;
create trigger trg_tenants_enforce_capacity
before insert or update of room_id, is_active on public.tenants
for each row execute function public.tenants_enforce_capacity();

create or replace function public.tenants_refresh_occupancy()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_room_occupied_spaces(old.room_id);
    return old;
  end if;

  perform public.refresh_room_occupied_spaces(new.room_id);
  if tg_op = 'UPDATE' and old.room_id is distinct from new.room_id then
    perform public.refresh_room_occupied_spaces(old.room_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tenants_refresh_occupancy on public.tenants;
create trigger trg_tenants_refresh_occupancy
after insert or update or delete on public.tenants
for each row execute function public.tenants_refresh_occupancy();

alter table public.tenants enable row level security;
alter table public.tenants force row level security;

drop policy if exists "Members can read tenants" on public.tenants;
create policy "Members can read tenants"
on public.tenants
for select
to authenticated
using (public.is_site_member(site_id));

drop policy if exists "Members can insert tenants" on public.tenants;
create policy "Members can insert tenants"
on public.tenants
for insert
to authenticated
with check (public.is_site_member(site_id));

drop policy if exists "Members can update tenants" on public.tenants;
create policy "Members can update tenants"
on public.tenants
for update
to authenticated
using (public.is_site_member(site_id))
with check (public.is_site_member(site_id));

drop policy if exists "Members can delete tenants" on public.tenants;
create policy "Members can delete tenants"
on public.tenants
for delete
to authenticated
using (public.is_site_member(site_id));

grant select, insert, update, delete on public.tenants to authenticated;

-- Standard floors + rooms for HM Dormitory
-- Ground / Second: 101-104 and 107-110 big (10), 105-106 small (4)
-- Third: 301-310 small (4) — 10 rooms, matching the other floors

insert into public.floors (site_id, name, floor_number, description, sort_order, is_active)
select s.id, f.name, f.floor_number, f.description, f.sort_order, true
from public.sites s
cross join (
  values
    ('Ground Floor', 1, 'Ten rooms. Big rooms hold 10 boarders; small rooms hold 4.', 1),
    ('Second Floor', 2, 'Ten rooms. Big rooms hold 10 boarders; small rooms hold 4.', 2),
    ('Third Floor', 3, 'Ten small rooms, each holding 4 boarders.', 3)
) as f(name, floor_number, description, sort_order)
where s.slug = 'hm-dormitory'
on conflict (site_id, floor_number) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

with catalog as (
  select *
  from (
    values
      (1, '101', 'Big room', 10, 'big', 101),
      (1, '102', 'Big room', 10, 'big', 102),
      (1, '103', 'Big room', 10, 'big', 103),
      (1, '104', 'Big room', 10, 'big', 104),
      (1, '105', 'Small room', 4, 'small', 105),
      (1, '106', 'Small room', 4, 'small', 106),
      (1, '107', 'Big room', 10, 'big', 107),
      (1, '108', 'Big room', 10, 'big', 108),
      (1, '109', 'Big room', 10, 'big', 109),
      (1, '110', 'Big room', 10, 'big', 110),
      (2, '201', 'Big room', 10, 'big', 201),
      (2, '202', 'Big room', 10, 'big', 202),
      (2, '203', 'Big room', 10, 'big', 203),
      (2, '204', 'Big room', 10, 'big', 204),
      (2, '205', 'Small room', 4, 'small', 205),
      (2, '206', 'Small room', 4, 'small', 206),
      (2, '207', 'Big room', 10, 'big', 207),
      (2, '208', 'Big room', 10, 'big', 208),
      (2, '209', 'Big room', 10, 'big', 209),
      (2, '210', 'Big room', 10, 'big', 210),
      (3, '301', 'Small room', 4, 'small', 301),
      (3, '302', 'Small room', 4, 'small', 302),
      (3, '303', 'Small room', 4, 'small', 303),
      (3, '304', 'Small room', 4, 'small', 304),
      (3, '305', 'Small room', 4, 'small', 305),
      (3, '306', 'Small room', 4, 'small', 306),
      (3, '307', 'Small room', 4, 'small', 307),
      (3, '308', 'Small room', 4, 'small', 308),
      (3, '309', 'Small room', 4, 'small', 309),
      (3, '310', 'Small room', 4, 'small', 310)
  ) as t(floor_number, room_number, room_name, capacity, room_type, sort_order)
)
insert into public.rooms (
  site_id,
  floor_id,
  room_number,
  room_name,
  capacity,
  room_type,
  sort_order,
  is_active,
  occupied_spaces
)
select
  s.id,
  f.id,
  c.room_number,
  c.room_name,
  c.capacity,
  c.room_type,
  c.sort_order,
  true,
  least(coalesce(r.occupied_spaces, 0), c.capacity)
from catalog c
join public.sites s on s.slug = 'hm-dormitory'
join public.floors f
  on f.site_id = s.id
 and f.floor_number = c.floor_number
left join public.rooms r
  on r.site_id = s.id
 and r.room_number = c.room_number
on conflict (site_id, room_number) do update
set
  floor_id = excluded.floor_id,
  room_name = excluded.room_name,
  capacity = excluded.capacity,
  room_type = excluded.room_type,
  sort_order = excluded.sort_order,
  is_active = true,
  occupied_spaces = least(public.rooms.occupied_spaces, excluded.capacity);

update public.rooms r
set is_active = false
where r.site_id = (select id from public.sites where slug = 'hm-dormitory')
  and r.room_number not in (
    '101','102','103','104','105','106','107','108','109','110',
    '201','202','203','204','205','206','207','208','209','210',
    '301','302','303','304','305','306','307','308','309','310'
  );

-- Recalculate occupancy from active tenants after the layout is in place
do $$
declare
  room_row record;
begin
  for room_row in
    select id
    from public.rooms
    where site_id = (select id from public.sites where slug = 'hm-dormitory')
  loop
    perform public.refresh_room_occupied_spaces(room_row.id);
  end loop;
end;
$$;
