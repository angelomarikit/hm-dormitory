-- Electric and water charges per room, split among occupied boarders.
-- Run AFTER 014_registration_bed.sql. Safe to re-run.

create table if not exists public.utility_charges (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  period_start date not null,
  electricity_centavos integer not null default 0,
  water_centavos integer not null default 0,
  occupant_count integer not null,
  bill_image_path text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint utility_charges_money_non_negative check (
    electricity_centavos >= 0 and water_centavos >= 0 and occupant_count > 0
  )
);

create index if not exists idx_utility_charges_room
  on public.utility_charges (site_id, room_id, created_at desc);

alter table public.utility_charges enable row level security;
alter table public.utility_charges force row level security;

drop policy if exists "Read utility charges" on public.utility_charges;
create policy "Read utility charges"
on public.utility_charges for select to authenticated
using (
  public.is_ops_staff(site_id)
  or exists (
    select 1 from public.tenants t
    where t.room_id = utility_charges.room_id
      and t.user_id = auth.uid()
      and t.is_active = true
  )
);

drop policy if exists "Cms write utility charges" on public.utility_charges;
create policy "Cms write utility charges"
on public.utility_charges for insert to authenticated
with check (public.is_cms_staff(site_id));

grant select, insert on public.utility_charges to authenticated;

create or replace function public.apply_room_utilities(
  p_site_id uuid,
  p_room_id uuid,
  p_electricity_centavos integer,
  p_water_centavos integer,
  p_bill_image_path text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  i integer := 0;
  t record;
  v_period_start date;
  v_period_end date;
  v_due_on date;
  v_today date;
  v_elec integer;
  v_water integer;
  v_bill_id uuid;
  v_bill_no text;
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

  v_today := (timezone('Asia/Manila', now()))::date;
  v_period_start := date_trunc('month', timezone('Asia/Manila', now()))::date;
  v_period_end := (v_period_start + interval '1 month' - interval '1 day')::date;
  v_due_on := v_period_end;

  perform public.generate_monthly_bills_internal(p_site_id, v_period_start);

  select count(*)::int into n
  from public.tenants tn
  where tn.site_id = p_site_id
    and tn.room_id = p_room_id
    and tn.is_active = true;

  if n = 0 then
    raise exception 'This room has no boarders to split the bill with.';
  end if;

  for t in
    select tn.id, tn.bed_id
    from public.tenants tn
    where tn.site_id = p_site_id
      and tn.room_id = p_room_id
      and tn.is_active = true
    order by tn.full_name, tn.id
  loop
    v_elec := (p_electricity_centavos / n) + case when i < (p_electricity_centavos % n) then 1 else 0 end;
    v_water := (p_water_centavos / n) + case when i < (p_water_centavos % n) then 1 else 0 end;

    select b.id into v_bill_id
    from public.bills b
    where b.site_id = p_site_id
      and b.tenant_id = t.id
      and b.period_start = v_period_start
    limit 1;

    if v_bill_id is null then
      v_bill_no := 'BILL-' || to_char(v_period_start, 'YYYYMM') || '-' || lpad(nextval('public.bill_number_seq')::text, 5, '0');
      insert into public.bills (
        site_id, tenant_id, room_id, bed_id, bill_number, period_start, period_end, due_on,
        rent_centavos, electricity_centavos, water_centavos, total_centavos, status
      )
      values (
        p_site_id, t.id, p_room_id, t.bed_id, v_bill_no, v_period_start, v_period_end, v_due_on,
        0, v_elec, v_water, v_elec + v_water,
        case when v_due_on < v_today then 'overdue' else 'unpaid' end
      )
      returning id into v_bill_id;
    else
      update public.bills
      set
        electricity_centavos = public.bills.electricity_centavos + v_elec,
        water_centavos = public.bills.water_centavos + v_water,
        total_centavos = public.bills.rent_centavos
          + public.bills.electricity_centavos + v_elec
          + public.bills.water_centavos + v_water
          + public.bills.other_centavos
          - public.bills.discount_centavos,
        room_id = coalesce(public.bills.room_id, p_room_id)
      where public.bills.id = v_bill_id;
    end if;

    if v_elec > 0 then
      insert into public.bill_items (bill_id, label, amount_centavos)
      values (v_bill_id, 'Electric', v_elec);
    end if;
    if v_water > 0 then
      insert into public.bill_items (bill_id, label, amount_centavos)
      values (v_bill_id, 'Water', v_water);
    end if;

    perform public.sync_bill_status(v_bill_id);
    i := i + 1;
  end loop;

  insert into public.utility_charges (
    site_id, room_id, period_start, electricity_centavos, water_centavos,
    occupant_count, bill_image_path, notes, created_by
  )
  values (
    p_site_id,
    p_room_id,
    v_period_start,
    p_electricity_centavos,
    p_water_centavos,
    n,
    nullif(trim(coalesce(p_bill_image_path, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning id into v_charge_id;

  return jsonb_build_object(
    'id', v_charge_id,
    'occupant_count', n,
    'electricity_share_centavos', p_electricity_centavos / n,
    'water_share_centavos', p_water_centavos / n
  );
end;
$$;

grant execute on function public.apply_room_utilities(uuid, uuid, integer, integer, text, text) to authenticated;
