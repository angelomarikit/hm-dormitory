-- Applicants choose a room and bed. Admin review shows that allocation.
-- Run AFTER 009_live_ops.sql. Safe to re-run.

alter table public.registrations
  add column if not exists preferred_bed_id uuid references public.beds (id) on delete set null;

create unique index if not exists idx_registrations_pending_bed
  on public.registrations (preferred_bed_id)
  where preferred_bed_id is not null
    and status in ('pending', 'under_review');

create or replace function public.list_open_beds(p_site_id uuid)
returns table (
  bed_id uuid,
  room_id uuid,
  bed_code text,
  room_number text,
  monthly_rent_centavos integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.room_id,
    b.bed_code,
    r.room_number,
    coalesce(b.monthly_rent_centavos, 0)
  from public.beds b
  join public.rooms r on r.id = b.room_id
  where b.site_id = p_site_id
    and b.is_active = true
    and r.is_active = true
    and not exists (
      select 1 from public.tenants t
      where t.bed_id = b.id and t.is_active = true
    )
    and not exists (
      select 1 from public.registrations g
      where g.preferred_bed_id = b.id
        and g.status in ('pending', 'under_review')
    )
  order by r.room_number, b.sort_order, b.bed_code;
$$;

grant execute on function public.list_open_beds(uuid) to anon, authenticated;

create or replace function public.submit_site_registration(payload jsonb)
returns public.registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  rec public.registrations;
  ref text;
  v_room uuid;
  v_bed uuid;
begin
  if uid is null then
    raise exception 'Sign in required to submit an application.';
  end if;

  sid := (payload->>'site_id')::uuid;
  if sid is null then
    raise exception 'Site is required.';
  end if;

  v_room := nullif(payload->>'preferred_room_id', '')::uuid;
  v_bed := nullif(payload->>'preferred_bed_id', '')::uuid;

  if v_bed is null or v_room is null then
    raise exception 'Choose a room and a bed.';
  end if;

  if not exists (
    select 1 from public.beds b
    where b.id = v_bed
      and b.room_id = v_room
      and b.site_id = sid
      and b.is_active = true
  ) then
    raise exception 'That bed is not available in the selected room.';
  end if;

  if exists (select 1 from public.tenants t where t.bed_id = v_bed and t.is_active = true)
     or exists (
       select 1 from public.registrations g
       where g.preferred_bed_id = v_bed
         and g.status in ('pending', 'under_review')
         and g.user_id is distinct from uid
     )
  then
    raise exception 'That bed was just taken. Please choose another.';
  end if;

  select * into rec
  from public.registrations
  where site_id = sid
    and user_id = uid
    and status in ('pending', 'under_review')
  order by created_at desc
  limit 1;

  if rec.id is not null then
    update public.registrations
    set
      preferred_room_id = v_room,
      preferred_bed_id = v_bed,
      full_name = coalesce(nullif(trim(payload->>'full_name'), ''), rec.full_name),
      email = coalesce(nullif(lower(trim(payload->>'email')), ''), rec.email)
    where id = rec.id
    returning * into rec;
    return rec;
  end if;

  ref := public.next_registration_reference(sid);

  insert into public.registrations (
    site_id, user_id, reference_number, status,
    full_name, date_of_birth, gender, nationality, home_address,
    occupancy_type, school_or_company, email, mobile,
    emergency_name, emergency_relationship, emergency_phone,
    preferred_room_type, preferred_room_id, preferred_bed_id, preferred_move_in,
    expected_stay, special_requests, terms_accepted_at
  )
  values (
    sid,
    uid,
    ref,
    'pending',
    nullif(trim(payload->>'full_name'), ''),
    nullif(payload->>'date_of_birth', '')::date,
    nullif(payload->>'gender', ''),
    nullif(payload->>'nationality', ''),
    nullif(trim(payload->>'home_address'), ''),
    nullif(payload->>'occupancy_type', ''),
    nullif(trim(payload->>'school_or_company'), ''),
    lower(trim(payload->>'email')),
    nullif(trim(payload->>'mobile'), ''),
    nullif(trim(payload->>'emergency_name'), ''),
    nullif(trim(payload->>'emergency_relationship'), ''),
    nullif(trim(payload->>'emergency_phone'), ''),
    nullif(payload->>'preferred_room_type', ''),
    v_room,
    v_bed,
    nullif(payload->>'preferred_move_in', '')::date,
    nullif(trim(payload->>'expected_stay'), ''),
    nullif(trim(payload->>'special_requests'), ''),
    timezone('utc', now())
  )
  returning * into rec;

  insert into public.boarder_profiles (
    site_id, user_id, status, occupancy_type, school_or_company,
    date_of_birth, gender, nationality, home_address,
    emergency_name, emergency_relationship, emergency_phone
  )
  values (
    sid, uid, 'pending', rec.occupancy_type, rec.school_or_company,
    rec.date_of_birth, rec.gender, rec.nationality, rec.home_address,
    rec.emergency_name, rec.emergency_relationship, rec.emergency_phone
  )
  on conflict (user_id) do update
    set status = 'pending',
        occupancy_type = excluded.occupancy_type,
        school_or_company = excluded.school_or_company,
        date_of_birth = excluded.date_of_birth,
        gender = excluded.gender,
        nationality = excluded.nationality,
        home_address = excluded.home_address,
        emergency_name = excluded.emergency_name,
        emergency_relationship = excluded.emergency_relationship,
        emergency_phone = excluded.emergency_phone,
        updated_at = timezone('utc', now());

  return rec;
end;
$$;

grant execute on function public.submit_site_registration(jsonb) to authenticated;
