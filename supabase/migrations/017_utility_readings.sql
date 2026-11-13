-- Previous and existing meter readings for electric and water.
-- Run AFTER 016_utility_month_generate.sql. Safe to re-run.

alter table public.utility_charges
  add column if not exists electricity_previous_reading numeric,
  add column if not exists electricity_current_reading numeric,
  add column if not exists water_previous_reading numeric,
  add column if not exists water_current_reading numeric;

drop function if exists public.save_room_utilities(uuid, uuid, date, integer, integer, text, text);

create or replace function public.save_room_utilities(
  p_site_id uuid,
  p_room_id uuid,
  p_period_start date,
  p_electricity_centavos integer,
  p_water_centavos integer,
  p_bill_image_path text,
  p_notes text,
  p_electricity_previous_reading numeric,
  p_electricity_current_reading numeric,
  p_water_previous_reading numeric,
  p_water_current_reading numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  v_existing uuid;
  v_applied timestamptz;
  v_charge_id uuid;
begin
  if not public.is_cms_staff(p_site_id) then
    raise exception 'Not allowed.';
  end if;
  if coalesce(p_electricity_centavos, 0) < 0 or coalesce(p_water_centavos, 0) < 0 then
    raise exception 'Amounts cannot be negative.';
  end if;
  if coalesce(p_electricity_centavos, 0) = 0 and coalesce(p_water_centavos, 0) = 0 then
    raise exception 'Enter an electric or water amount.';
  end if;
  if not exists (
    select 1 from public.rooms r where r.id = p_room_id and r.site_id = p_site_id
  ) then
    raise exception 'Room was not found.';
  end if;

  select count(*)::int into n
  from public.tenants tn
  where tn.site_id = p_site_id
    and tn.room_id = p_room_id
    and tn.is_active = true;

  if n = 0 then
    raise exception 'This room has no boarders to split the bill with.';
  end if;

  select c.id, c.applied_at into v_existing, v_applied
  from public.utility_charges c
  where c.site_id = p_site_id
    and c.room_id = p_room_id
    and c.period_start = p_period_start
  order by c.created_at desc
  limit 1;

  if v_existing is not null and v_applied is not null then
    raise exception 'This room already has a generated bill for that month. Delete it first if it was a mistake.';
  end if;

  if v_existing is not null then
    update public.utility_charges
    set
      electricity_centavos = p_electricity_centavos,
      water_centavos = p_water_centavos,
      occupant_count = n,
      bill_image_path = coalesce(nullif(trim(coalesce(p_bill_image_path, '')), ''), bill_image_path),
      notes = nullif(trim(coalesce(p_notes, '')), ''),
      electricity_previous_reading = p_electricity_previous_reading,
      electricity_current_reading = p_electricity_current_reading,
      water_previous_reading = p_water_previous_reading,
      water_current_reading = p_water_current_reading,
      created_by = auth.uid()
    where id = v_existing
    returning id into v_charge_id;
  else
    insert into public.utility_charges (
      site_id, room_id, period_start, electricity_centavos, water_centavos,
      occupant_count, bill_image_path, notes, created_by, applied_at,
      electricity_previous_reading, electricity_current_reading,
      water_previous_reading, water_current_reading
    )
    values (
      p_site_id,
      p_room_id,
      p_period_start,
      p_electricity_centavos,
      p_water_centavos,
      n,
      nullif(trim(coalesce(p_bill_image_path, '')), ''),
      nullif(trim(coalesce(p_notes, '')), ''),
      auth.uid(),
      null,
      p_electricity_previous_reading,
      p_electricity_current_reading,
      p_water_previous_reading,
      p_water_current_reading
    )
    returning id into v_charge_id;
  end if;

  return jsonb_build_object('id', v_charge_id, 'occupant_count', n, 'pending', true);
end;
$$;

grant execute on function public.save_room_utilities(uuid, uuid, date, integer, integer, text, text, numeric, numeric, numeric, numeric) to authenticated;
