-- Fix ERROR 42702: column reference "due_on" is ambiguous
-- Run AFTER 009_live_ops.sql. Safe to re-run.

create or replace function public.generate_monthly_bills_internal(p_site_id uuid, p_period_start date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_generated integer := 0;
  t record;
  v_rent integer;
  v_total integer;
  v_period_end date;
  v_due_on date;
  v_bill_no text;
  v_today date := (timezone('Asia/Manila', now()))::date;
begin
  v_period_end := (p_period_start + interval '1 month' - interval '1 day')::date;
  v_due_on := v_period_end;

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
    v_rent := t.rent;
    if v_rent <= 0 then
      continue;
    end if;
    v_total := v_rent;
    v_bill_no := 'BILL-' || to_char(p_period_start, 'YYYYMM') || '-' || lpad(nextval('public.bill_number_seq')::text, 5, '0');

    insert into public.bills (
      site_id, tenant_id, room_id, bed_id, bill_number, period_start, period_end, due_on,
      rent_centavos, total_centavos, status
    )
    values (
      p_site_id, t.id, t.room_id, t.bed_id, v_bill_no, p_period_start, v_period_end, v_due_on,
      v_rent, v_total,
      case when v_due_on < v_today then 'overdue' else 'unpaid' end
    )
    on conflict (site_id, tenant_id, period_start) do nothing;

    if found then
      v_generated := v_generated + 1;
      insert into public.bill_items (bill_id, label, amount_centavos)
      select bills.id, 'Bed rent', bills.rent_centavos from public.bills
      where bills.site_id = p_site_id and bills.tenant_id = t.id and bills.period_start = p_period_start
      limit 1;
    end if;
  end loop;

  update public.bills
  set status = 'overdue', updated_at = timezone('utc', now())
  where bills.site_id = p_site_id
    and bills.status in ('unpaid', 'partially_paid')
    and bills.due_on < v_today;

  return v_generated;
end;
$$;
