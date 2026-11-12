-- WAVE 5 — Payments. Run after 005_billing.sql.
-- Confirmed payments are the only amounts that change bill.paid_centavos.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  bill_id uuid not null references public.bills (id) on delete restrict,
  amount_centavos integer not null,
  method text not null,
  status text not null default 'pending_verification',
  reference_number text,
  paid_on date not null default (timezone('Asia/Manila', now()))::date,
  notes text,
  submitted_by uuid references auth.users (id) on delete set null,
  recorded_by uuid references auth.users (id) on delete set null,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payments_amount_positive check (amount_centavos > 0),
  constraint payments_method_check check (method in ('gcash', 'maya', 'qrph', 'cash')),
  constraint payments_status_check check (
    status in ('pending_verification', 'confirmed', 'rejected', 'reversed')
  )
);

create unique index if not exists idx_payments_unique_ewallet_ref
  on public.payments (site_id, lower(reference_number))
  where reference_number is not null
    and method in ('gcash', 'maya', 'qrph')
    and status in ('pending_verification', 'confirmed');

create index if not exists idx_payments_bill on public.payments (bill_id, status);
create index if not exists idx_payments_site on public.payments (site_id, status, created_at desc);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  payment_id uuid not null references public.payments (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  bill_id uuid not null references public.bills (id) on delete cascade,
  amount_centavos integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.confirm_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;
  if not public.is_cms_staff(pay.site_id) then
    raise exception 'Not allowed.';
  end if;
  if pay.status = 'confirmed' then
    return pay;
  end if;
  if pay.status not in ('pending_verification') then
    raise exception 'This payment cannot be confirmed.';
  end if;

  update public.payments
  set
    status = 'confirmed',
    verified_by = auth.uid(),
    verified_at = timezone('utc', now())
  where id = p_payment_id
    and status = 'pending_verification';

  if not found then
    select * into pay from public.payments where id = p_payment_id;
    return pay;
  end if;

  update public.bills
  set paid_centavos = paid_centavos + pay.amount_centavos
  where id = pay.bill_id;

  insert into public.payment_allocations (payment_id, bill_id, amount_centavos)
  values (pay.id, pay.bill_id, pay.amount_centavos);

  perform public.sync_bill_status(pay.bill_id);

  select * into pay from public.payments where id = p_payment_id;
  return pay;
end;
$$;

create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A rejection reason is required.';
  end if;

  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;
  if not public.is_cms_staff(pay.site_id) then
    raise exception 'Not allowed.';
  end if;
  if pay.status <> 'pending_verification' then
    raise exception 'Only pending payments can be rejected.';
  end if;

  update public.payments
  set
    status = 'rejected',
    rejection_reason = trim(p_reason),
    verified_by = auth.uid(),
    verified_at = timezone('utc', now())
  where id = p_payment_id;

  select * into pay from public.payments where id = p_payment_id;
  return pay;
end;
$$;

create or replace function public.record_cash_collection(
  p_site_id uuid,
  p_tenant_id uuid,
  p_bill_id uuid,
  p_amount_centavos integer,
  p_paid_on date,
  p_notes text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments;
  needs_review boolean;
begin
  if not public.is_ops_staff(p_site_id) then
    raise exception 'Not allowed.';
  end if;
  if p_amount_centavos <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  needs_review := public.is_caretaker(p_site_id) and not public.is_cms_staff(p_site_id);

  insert into public.payments (
    site_id, tenant_id, bill_id, amount_centavos, method, status,
    paid_on, notes, recorded_by, submitted_by
  )
  values (
    p_site_id, p_tenant_id, p_bill_id, p_amount_centavos, 'cash',
    case when needs_review then 'pending_verification' else 'confirmed' end,
    coalesce(p_paid_on, (timezone('Asia/Manila', now()))::date),
    p_notes, auth.uid(), auth.uid()
  )
  returning * into pay;

  if pay.status = 'confirmed' then
    update public.payments
    set verified_by = auth.uid(), verified_at = timezone('utc', now())
    where id = pay.id;

    update public.bills
    set paid_centavos = paid_centavos + pay.amount_centavos
    where id = pay.bill_id;

    insert into public.payment_allocations (payment_id, bill_id, amount_centavos)
    values (pay.id, pay.bill_id, pay.amount_centavos);

    perform public.sync_bill_status(pay.bill_id);
  end if;

  select * into pay from public.payments where id = pay.id;
  return pay;
end;
$$;

grant execute on function public.confirm_payment(uuid) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.record_cash_collection(uuid, uuid, uuid, integer, date, text) to authenticated;

alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.payment_receipts enable row level security;
alter table public.payment_receipts force row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_allocations force row level security;

drop policy if exists "Read payments" on public.payments;
create policy "Read payments"
on public.payments for select to authenticated
using (
  public.is_ops_staff(payments.site_id)
  or exists (
    select 1 from public.tenants t
    where t.id = payments.tenant_id and t.user_id = auth.uid()
  )
);

drop policy if exists "Boarder insert ewallet payment" on public.payments;
create policy "Boarder insert ewallet payment"
on public.payments for insert to authenticated
with check (
  payments.method in ('gcash', 'maya', 'qrph')
  and payments.status = 'pending_verification'
  and exists (
    select 1 from public.tenants t
    where t.id = payments.tenant_id
      and t.user_id = auth.uid()
      and t.site_id = payments.site_id
  )
);

drop policy if exists "Read receipts" on public.payment_receipts;
create policy "Read receipts"
on public.payment_receipts for select to authenticated
using (
  public.is_ops_staff(payment_receipts.site_id)
  or exists (
    select 1 from public.payments p
    join public.tenants t on t.id = p.tenant_id
    where p.id = payment_receipts.payment_id and t.user_id = auth.uid()
  )
);

drop policy if exists "Insert receipts" on public.payment_receipts;
create policy "Insert receipts"
on public.payment_receipts for insert to authenticated
with check (
  public.is_ops_staff(payment_receipts.site_id)
  or exists (
    select 1 from public.payments p
    join public.tenants t on t.id = p.tenant_id
    where p.id = payment_receipts.payment_id
      and t.user_id = auth.uid()
      and p.site_id = payment_receipts.site_id
  )
);

drop policy if exists "Read allocations" on public.payment_allocations;
create policy "Read allocations"
on public.payment_allocations for select to authenticated
using (
  exists (
    select 1 from public.payments p
    where p.id = payment_allocations.payment_id
      and (
        public.is_ops_staff(p.site_id)
        or exists (select 1 from public.tenants t where t.id = p.tenant_id and t.user_id = auth.uid())
      )
  )
);

grant select, insert, update on public.payments to authenticated;
grant select, insert on public.payment_receipts to authenticated;
grant select, insert on public.payment_allocations to authenticated;
