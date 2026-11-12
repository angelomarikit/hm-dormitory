-- Month picker, generate-to-billing, per-boarder shares, and delete for electric/water.
-- Run AFTER 015_utility_meters.sql. Safe to re-run.

alter table public.utility_charges
  add column if not exists applied_at timestamptz;

update public.utility_charges
set applied_at = created_at
where applied_at is null;

alter table public.bill_items
  add column if not exists utility_charge_id uuid references public.utility_charges (id) on delete set null;

create table if not exists public.utility_charge_shares (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.utility_charges (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  bill_id uuid references public.bills (id) on delete set null,
  electricity_centavos integer not null default 0,
  water_centavos integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_utility_charge_shares_charge
  on public.utility_charge_shares (charge_id);

alter table public.utility_charge_shares enable row level security;
alter table public.utility_charge_shares force row level security;

drop policy if exists "Read utility shares" on public.utility_charge_shares;
create policy "Read utility shares"
on public.utility_charge_shares for select to authenticated
using (
  exists (
    select 1 from public.utility_charges c
    where c.id = charge_id
      and (
        public.is_ops_staff(c.site_id)
        or exists (
          select 1 from public.tenants t
          where t.id = utility_charge_shares.tenant_id and t.user_id = auth.uid()
        )
      )
  )
);

grant select on public.utility_charge_shares to authenticated;

drop policy if exists "Cms write utility charges" on public.utility_charges;
drop policy if exists "Cms insert utility charges" on public.utility_charges;
drop policy if exists "Cms update utility charges" on public.utility_charges;
drop policy if exists "Cms delete utility charges" on public.utility_charges;

create policy "Cms insert utility charges"
on public.utility_charges for insert to authenticated
with check (public.is_cms_staff(site_id));

create policy "Cms update utility charges"
on public.utility_charges for update to authenticated
using (public.is_cms_staff(site_id))
with check (public.is_cms_staff(site_id));

create policy "Cms delete utility charges"
on public.utility_charges for delete to authenticated
using (public.is_cms_staff(site_id));

grant select, insert, update, delete on public.utility_charges to authenticated;

create or replace function public.save_room_utilities(
  p_site_id uuid,
  p_room_id uuid,
  p_period_start date,
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
      created_by = auth.uid()
    where id = v_existing
    returning id into v_charge_id;
  else
    insert into public.utility_charges (
      site_id, room_id, period_start, electricity_centavos, water_centavos,
      occupant_count, bill_image_path, notes, created_by, applied_at
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
      null
    )
    returning id into v_charge_id;
  end if;

  return jsonb_build_object('id', v_charge_id, 'occupant_count', n, 'pending', true);
end;
$$;

create or replace function public.apply_one_utility_charge(p_charge_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.utility_charges%rowtype;
  n integer := 0;
  i integer := 0;
  t record;
  v_period_end date;
  v_due_on date;
  v_today date;
  v_elec integer;
  v_water integer;
  v_bill_id uuid;
  v_bill_no text;
begin
  select * into c from public.utility_charges where id = p_charge_id;
  if not found then
    raise exception 'Charge was not found.';
  end if;
  if c.applied_at is not null then
    return 0;
  end if;

  v_today := (timezone('Asia/Manila', now()))::date;
  v_period_end := (c.period_start + interval '1 month' - interval '1 day')::date;
  v_due_on := v_period_end;

  perform public.generate_monthly_bills_internal(c.site_id, c.period_start);

  select count(*)::int into n
  from public.tenants tn
  where tn.site_id = c.site_id
    and tn.room_id = c.room_id
    and tn.is_active = true;

  if n = 0 then
    raise exception 'Room has no boarders to split the bill with.';
  end if;

  delete from public.utility_charge_shares where charge_id = c.id;

  for t in
    select tn.id, tn.bed_id
    from public.tenants tn
    where tn.site_id = c.site_id
      and tn.room_id = c.room_id
      and tn.is_active = true
    order by tn.full_name, tn.id
  loop
    v_elec := (c.electricity_centavos / n) + case when i < (c.electricity_centavos % n) then 1 else 0 end;
    v_water := (c.water_centavos / n) + case when i < (c.water_centavos % n) then 1 else 0 end;

    select b.id into v_bill_id
    from public.bills b
    where b.site_id = c.site_id
      and b.tenant_id = t.id
      and b.period_start = c.period_start
    limit 1;

    if v_bill_id is null then
      v_bill_no := 'BILL-' || to_char(c.period_start, 'YYYYMM') || '-' || lpad(nextval('public.bill_number_seq')::text, 5, '0');
      insert into public.bills (
        site_id, tenant_id, room_id, bed_id, bill_number, period_start, period_end, due_on,
        rent_centavos, electricity_centavos, water_centavos, total_centavos, status
      )
      values (
        c.site_id, t.id, c.room_id, t.bed_id, v_bill_no, c.period_start, v_period_end, v_due_on,
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
        room_id = coalesce(public.bills.room_id, c.room_id)
      where public.bills.id = v_bill_id;
    end if;

    if v_elec > 0 then
      insert into public.bill_items (bill_id, label, amount_centavos, utility_charge_id)
      values (v_bill_id, 'Electric', v_elec, c.id);
    end if;
    if v_water > 0 then
      insert into public.bill_items (bill_id, label, amount_centavos, utility_charge_id)
      values (v_bill_id, 'Water', v_water, c.id);
    end if;

    insert into public.utility_charge_shares (
      charge_id, tenant_id, bill_id, electricity_centavos, water_centavos
    )
    values (c.id, t.id, v_bill_id, v_elec, v_water);

    perform public.sync_bill_status(v_bill_id);
    i := i + 1;
  end loop;

  update public.utility_charges
  set applied_at = timezone('utc', now()), occupant_count = n
  where id = c.id;

  return n;
end;
$$;

create or replace function public.generate_month_utilities(p_site_id uuid, p_period_start date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rooms integer := 0;
  v_boarders integer := 0;
  rec record;
  n integer;
begin
  if not public.is_cms_staff(p_site_id) then
    raise exception 'Not allowed.';
  end if;

  for rec in
    select c.id
    from public.utility_charges c
    where c.site_id = p_site_id
      and c.period_start = p_period_start
      and c.applied_at is null
    order by c.created_at
  loop
    n := public.apply_one_utility_charge(rec.id);
    v_rooms := v_rooms + 1;
    v_boarders := v_boarders + n;
  end loop;

  if v_rooms = 0 then
    raise exception 'Enter electric and water on a room first, then click Generate.';
  end if;

  return jsonb_build_object('rooms', v_rooms, 'boarders', v_boarders);
end;
$$;

create or replace function public.delete_utility_charge(p_charge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.utility_charges%rowtype;
  s record;
  t record;
  n integer := 0;
  i integer := 0;
  v_elec integer;
  v_water integer;
  v_bill_id uuid;
begin
  select * into c from public.utility_charges where id = p_charge_id;
  if not found then
    return;
  end if;
  if not public.is_cms_staff(c.site_id) then
    raise exception 'Not allowed.';
  end if;

  for s in
    select * from public.utility_charge_shares where charge_id = c.id
  loop
    if s.bill_id is not null then
      update public.bills
      set
        electricity_centavos = greatest(0, electricity_centavos - s.electricity_centavos),
        water_centavos = greatest(0, water_centavos - s.water_centavos),
        total_centavos = greatest(
          0,
          rent_centavos
            + greatest(0, electricity_centavos - s.electricity_centavos)
            + greatest(0, water_centavos - s.water_centavos)
            + other_centavos
            - discount_centavos
        )
      where id = s.bill_id;

      delete from public.bill_items
      where bill_id = s.bill_id
        and utility_charge_id = c.id;

      perform public.sync_bill_status(s.bill_id);
    end if;
  end loop;

  if c.applied_at is not null and not exists (
    select 1 from public.utility_charge_shares where charge_id = c.id
  ) then
    i := 0;
    select count(*)::int into n
    from public.tenants tn
    where tn.site_id = c.site_id
      and tn.room_id = c.room_id
      and tn.is_active = true;
    if n > 0 then
      for t in
        select tn.id
        from public.tenants tn
        where tn.site_id = c.site_id
          and tn.room_id = c.room_id
          and tn.is_active = true
        order by tn.full_name, tn.id
      loop
        v_elec := (c.electricity_centavos / n) + case when i < (c.electricity_centavos % n) then 1 else 0 end;
        v_water := (c.water_centavos / n) + case when i < (c.water_centavos % n) then 1 else 0 end;
        select b.id into v_bill_id
        from public.bills b
        where b.site_id = c.site_id
          and b.tenant_id = t.id
          and b.period_start = c.period_start
        limit 1;
        if v_bill_id is not null then
          update public.bills
          set
            electricity_centavos = greatest(0, electricity_centavos - v_elec),
            water_centavos = greatest(0, water_centavos - v_water),
            total_centavos = greatest(
              0,
              rent_centavos
                + greatest(0, electricity_centavos - v_elec)
                + greatest(0, water_centavos - v_water)
                + other_centavos
                - discount_centavos
            )
          where id = v_bill_id;
          delete from public.bill_items
          where bill_id = v_bill_id
            and label in ('Electric', 'Water')
            and amount_centavos in (v_elec, v_water)
            and (utility_charge_id = c.id or utility_charge_id is null);
          perform public.sync_bill_status(v_bill_id);
        end if;
        i := i + 1;
      end loop;
    end if;
  end if;

  delete from public.utility_charges where id = c.id;
end;
$$;

drop function if exists public.apply_room_utilities(uuid, uuid, integer, integer, text, text);

grant execute on function public.save_room_utilities(uuid, uuid, date, integer, integer, text, text) to authenticated;
grant execute on function public.generate_month_utilities(uuid, date) to authenticated;
grant execute on function public.delete_utility_charge(uuid) to authenticated;
revoke all on function public.apply_one_utility_charge(uuid) from public, anon, authenticated;
