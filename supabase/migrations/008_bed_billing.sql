-- WAVE 4b — Bill per occupied bed, not per room.
-- Run AFTER 005_billing.sql (006/007 can already be applied).
-- HM Dormitory slug: hm-dormitory
--
-- A room can have 10 beds. Each assigned boarder gets their own bill
-- from that bed’s monthly rent. Empty beds are not billed.

alter table public.beds
  add column if not exists monthly_rent_centavos integer not null default 0;

alter table public.beds drop constraint if exists beds_rent_non_negative;
alter table public.beds
  add constraint beds_rent_non_negative check (monthly_rent_centavos >= 0);

alter table public.bills
  add column if not exists bed_id uuid references public.beds (id) on delete set null;

-- If a room rent was already saved, copy it onto that room’s beds.
update public.beds b
set monthly_rent_centavos = r.monthly_rent_centavos
from public.rooms r
join public.sites s on s.id = r.site_id
where b.room_id = r.id
  and s.slug = 'hm-dormitory'
  and b.monthly_rent_centavos = 0
  and r.monthly_rent_centavos > 0;

create or replace function public.generate_monthly_bills(p_site_id uuid, p_period_start date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  due_d integer;
  generated integer := 0;
  t record;
  rent integer;
  total integer;
  period_end date;
  due_on date;
  bill_no text;
begin
  if not public.is_cms_staff(p_site_id) then
    raise exception 'Not allowed.';
  end if;

  select due_day into due_d from public.billing_settings where site_id = p_site_id;
  if due_d is null then
    due_d := 5;
  end if;

  period_end := (p_period_start + interval '1 month' - interval '1 day')::date;
  due_on := make_date(extract(year from p_period_start)::int, extract(month from p_period_start)::int, due_d);

  for t in
    select
      tn.id,
      tn.room_id,
      tn.bed_id,
      coalesce(nullif(b.monthly_rent_centavos, 0), nullif(bp.monthly_rent_centavos, 0), 0) as rent
    from public.tenants tn
    join public.beds b on b.id = tn.bed_id and b.is_active = true
    left join public.boarder_profiles bp on bp.tenant_id = tn.id
    where tn.site_id = p_site_id
      and tn.is_active = true
      and tn.bed_id is not null
  loop
    rent := t.rent;
    if rent <= 0 then
      continue;
    end if;
    total := rent;
    bill_no := 'BILL-' || to_char(p_period_start, 'YYYYMM') || '-' || lpad(nextval('public.bill_number_seq')::text, 5, '0');

    insert into public.bills (
      site_id, tenant_id, room_id, bed_id, bill_number, period_start, period_end, due_on,
      rent_centavos, total_centavos, status
    )
    values (
      p_site_id, t.id, t.room_id, t.bed_id, bill_no, p_period_start, period_end, due_on,
      rent, total,
      case when due_on < (timezone('Asia/Manila', now()))::date then 'overdue' else 'unpaid' end
    )
    on conflict (site_id, tenant_id, period_start) do nothing;

    if found then
      generated := generated + 1;
      insert into public.bill_items (bill_id, label, amount_centavos)
      select id, 'Bed rent', rent_centavos from public.bills
      where site_id = p_site_id and tenant_id = t.id and period_start = p_period_start
      limit 1;
    end if;
  end loop;

  return generated;
end;
$$;

grant execute on function public.generate_monthly_bills(uuid, date) to authenticated;
