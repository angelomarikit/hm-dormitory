-- WAVE 4 — Billing. Run after 004_ops_foundation.sql.

alter table public.rooms
  add column if not exists monthly_rent_centavos integer not null default 0;

alter table public.rooms
  drop constraint if exists rooms_rent_non_negative;
alter table public.rooms
  add constraint rooms_rent_non_negative check (monthly_rent_centavos >= 0);

alter table public.beds
  add column if not exists monthly_rent_centavos integer not null default 0;

alter table public.beds drop constraint if exists beds_rent_non_negative;
alter table public.beds
  add constraint beds_rent_non_negative check (monthly_rent_centavos >= 0);

create table if not exists public.billing_settings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null unique references public.sites (id) on delete cascade,
  due_day integer not null default 5,
  auto_generate boolean not null default false,
  electricity_label text,
  water_label text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_settings_due_day check (due_day between 1 and 28)
);

insert into public.billing_settings (site_id)
select id from public.sites
where slug = 'hm-dormitory'
on conflict (site_id) do nothing;

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  room_id uuid references public.rooms (id) on delete set null,
  bill_number text not null,
  period_start date not null,
  period_end date not null,
  due_on date not null,
  rent_centavos integer not null default 0,
  electricity_centavos integer not null default 0,
  water_centavos integer not null default 0,
  other_centavos integer not null default 0,
  discount_centavos integer not null default 0,
  total_centavos integer not null default 0,
  paid_centavos integer not null default 0,
  status text not null default 'unpaid',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bills_status_check check (status in ('unpaid', 'partially_paid', 'paid', 'overdue', 'voided')),
  constraint bills_site_number_unique unique (site_id, bill_number),
  constraint bills_tenant_period_unique unique (site_id, tenant_id, period_start),
  constraint bills_money_non_negative check (
    rent_centavos >= 0 and electricity_centavos >= 0 and water_centavos >= 0
    and other_centavos >= 0 and discount_centavos >= 0 and paid_centavos >= 0
  )
);

alter table public.bills
  add column if not exists bed_id uuid references public.beds (id) on delete set null;

create index if not exists idx_bills_tenant on public.bills (tenant_id, period_start desc);
create index if not exists idx_bills_site_status on public.bills (site_id, status);

drop trigger if exists trg_bills_updated_at on public.bills;
create trigger trg_bills_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  label text not null,
  amount_centavos integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create sequence if not exists public.bill_number_seq;

create or replace function public.sync_bill_status(p_bill_id uuid)
returns void
language plpgsql
as $$
declare
  rec public.bills%rowtype;
begin
  select * into rec from public.bills where id = p_bill_id for update;
  if not found or rec.status = 'voided' then
    return;
  end if;

  if rec.paid_centavos <= 0 then
    rec.status := case when rec.due_on < (timezone('Asia/Manila', now()))::date then 'overdue' else 'unpaid' end;
  elsif rec.paid_centavos >= rec.total_centavos then
    rec.status := 'paid';
  else
    rec.status := 'partially_paid';
  end if;

  update public.bills
  set status = rec.status
  where id = p_bill_id;
end;
$$;

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

alter table public.billing_settings enable row level security;
alter table public.billing_settings force row level security;
alter table public.bills enable row level security;
alter table public.bills force row level security;
alter table public.bill_items enable row level security;
alter table public.bill_items force row level security;

drop policy if exists "Cms billing settings" on public.billing_settings;
create policy "Cms billing settings"
on public.billing_settings for all to authenticated
using (public.is_cms_staff(site_id))
with check (public.is_cms_staff(site_id));

drop policy if exists "Read bills" on public.bills;
create policy "Read bills"
on public.bills for select to authenticated
using (
  public.is_ops_staff(site_id)
  or exists (select 1 from public.tenants t where t.id = tenant_id and t.user_id = auth.uid())
);

drop policy if exists "Cms write bills" on public.bills;
create policy "Cms write bills"
on public.bills for insert to authenticated
with check (public.is_cms_staff(site_id));

drop policy if exists "Cms update bills" on public.bills;
create policy "Cms update bills"
on public.bills for update to authenticated
using (public.is_cms_staff(site_id))
with check (public.is_cms_staff(site_id));

drop policy if exists "Read bill items" on public.bill_items;
create policy "Read bill items"
on public.bill_items for select to authenticated
using (
  exists (
    select 1 from public.bills b
    where b.id = bill_id
      and (
        public.is_ops_staff(b.site_id)
        or exists (select 1 from public.tenants t where t.id = b.tenant_id and t.user_id = auth.uid())
      )
  )
);

drop policy if exists "Cms write bill items" on public.bill_items;
create policy "Cms write bill items"
on public.bill_items for insert to authenticated
with check (
  exists (select 1 from public.bills b where b.id = bill_id and public.is_cms_staff(b.site_id))
);

grant select, insert, update on public.billing_settings to authenticated;
grant select, insert, update on public.bills to authenticated;
grant select, insert on public.bill_items to authenticated;
