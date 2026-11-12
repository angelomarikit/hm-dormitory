-- WAVE 8 — Live billing, due reminders, registration RPC, realtime.
-- Run AFTER 008_bed_billing.sql.
-- HM Dormitory slug: hm-dormitory
--
-- Bills are created automatically for occupied beds (due last day of the month).
-- Boarders get a payment notice 7 days before due.

alter table public.bills
  add column if not exists due_reminder_sent_at timestamptz;

drop policy if exists "Applicant insert registration" on public.registrations;
create policy "Applicant insert registration"
on public.registrations for insert to authenticated
with check (user_id = auth.uid() or public.is_cms_staff(site_id));

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
begin
  if uid is null then
    raise exception 'Sign in required to submit an application.';
  end if;

  sid := (payload->>'site_id')::uuid;
  if sid is null then
    raise exception 'Site is required.';
  end if;

  select * into rec
  from public.registrations
  where site_id = sid
    and user_id = uid
    and status in ('pending', 'under_review')
  order by created_at desc
  limit 1;

  if rec.id is not null then
    return rec;
  end if;

  ref := public.next_registration_reference(sid);

  insert into public.registrations (
    site_id, user_id, reference_number, status,
    full_name, date_of_birth, gender, nationality, home_address,
    occupancy_type, school_or_company, email, mobile,
    emergency_name, emergency_relationship, emergency_phone,
    preferred_room_type, preferred_room_id, preferred_move_in,
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
    nullif(payload->>'preferred_room_id', '')::uuid,
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

create or replace function public.generate_monthly_bills(p_site_id uuid, p_period_start date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_ops_staff(p_site_id) or public.is_boarder_for_site(p_site_id)) then
    raise exception 'Not allowed.';
  end if;
  return public.generate_monthly_bills_internal(p_site_id, p_period_start);
end;
$$;

revoke all on function public.generate_monthly_bills_internal(uuid, date) from public, anon, authenticated;
grant execute on function public.generate_monthly_bills(uuid, date) to authenticated;

create or replace function public.ensure_monthly_bills(p_site_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start date;
begin
  if not (public.is_ops_staff(p_site_id) or public.is_boarder_for_site(p_site_id)) then
    raise exception 'Not allowed.';
  end if;
  period_start := date_trunc('month', timezone('Asia/Manila', now()))::date;
  return public.generate_monthly_bills_internal(p_site_id, period_start);
end;
$$;

grant execute on function public.ensure_monthly_bills(uuid) to authenticated;

create or replace function public.ensure_due_reminders(p_site_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  today_m date := (timezone('Asia/Manila', now()))::date;
  sent integer := 0;
  b record;
  notice_id uuid;
begin
  if not (public.is_ops_staff(p_site_id) or public.is_boarder_for_site(p_site_id)) then
    raise exception 'Not allowed.';
  end if;

  for b in
    select
      bills.id,
      bills.tenant_id,
      bills.due_on,
      bills.total_centavos,
      bills.paid_centavos,
      bills.bill_number,
      tn.user_id,
      tn.full_name
    from public.bills
    join public.tenants tn on tn.id = bills.tenant_id
    where bills.site_id = p_site_id
      and bills.status in ('unpaid', 'partially_paid', 'overdue')
      and bills.due_reminder_sent_at is null
      and bills.due_on - 7 <= today_m
      and bills.total_centavos > bills.paid_centavos
  loop
    insert into public.notices (
      site_id, title, body, category, priority, audience, published_at
    )
    values (
      p_site_id,
      'Rent due in 7 days',
      'Hi ' || b.full_name || ', bill ' || b.bill_number ||
      ' is due on ' || to_char(b.due_on, 'FMMonth DD, YYYY') ||
      '. Please settle your remaining balance before the end of the month.',
      'payment',
      'high',
      'individual',
      timezone('utc', now())
    )
    returning id into notice_id;

    insert into public.notice_recipients (notice_id, tenant_id)
    values (notice_id, b.tenant_id);

    if b.user_id is not null then
      insert into public.notifications (site_id, user_id, audience, title, body, link_path)
      values (
        p_site_id,
        b.user_id,
        'boarder',
        'Rent due in 7 days',
        'Bill ' || b.bill_number || ' is due on ' || to_char(b.due_on, 'FMMonth DD, YYYY') || '.',
        '/boarder/bills'
      );
    end if;

    update public.bills
    set due_reminder_sent_at = timezone('utc', now())
    where id = b.id;

    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

grant execute on function public.ensure_due_reminders(uuid) to authenticated;

create or replace function public.trg_tenant_ensure_bill()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active and new.bed_id is not null then
    perform public.generate_monthly_bills_internal(
      new.site_id,
      date_trunc('month', timezone('Asia/Manila', now()))::date
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tenants_ensure_bill on public.tenants;
create trigger trg_tenants_ensure_bill
after insert or update of bed_id, is_active
on public.tenants
for each row execute function public.trg_tenant_ensure_bill();

do $$
begin
  begin
    alter publication supabase_realtime add table public.registrations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.bills;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;
