-- PRODUCTION RESET — HM Dormitory operational data only.
-- Run AFTER 009_live_ops.sql when you are ready to go live.
-- Slug: hm-dormitory
--
-- Keeps: site, admins, rooms, beds, floors, rent, website copy (amenities, rates, FAQs, house rules, announcements).
-- Deletes: boarders, registrations, bills, payments, messages, notices, maintenance, activity.
-- Auth logins created during testing stay in Authentication → Users; delete those there if needed.

do $$
declare
  sid uuid;
begin
  select id into sid from public.sites where slug = 'hm-dormitory';
  if sid is null then
    raise exception 'Site slug hm-dormitory was not found.';
  end if;

  delete from public.payment_allocations
    where payment_id in (select id from public.payments where site_id = sid);
  delete from public.payment_receipts where site_id = sid;
  delete from public.payments where site_id = sid;
  delete from public.bill_items where bill_id in (select id from public.bills where site_id = sid);
  delete from public.bills where site_id = sid;
  begin
    execute 'delete from public.utility_charges where site_id = $1' using sid;
  exception
    when undefined_table then
      null;
  end;
  delete from public.message_read_states
    where conversation_id in (select id from public.conversations where site_id = sid);
  delete from public.messages where site_id = sid;
  delete from public.conversations where site_id = sid;
  delete from public.notice_recipients
    where notice_id in (select id from public.notices where site_id = sid);
  delete from public.notices where site_id = sid;
  delete from public.maintenance_requests where site_id = sid;
  delete from public.activity_logs where site_id = sid;
  delete from public.notifications where site_id = sid;
  delete from public.registration_documents where site_id = sid;
  delete from public.registration_status_history
    where registration_id in (select id from public.registrations where site_id = sid);
  delete from public.registrations where site_id = sid;
  delete from public.room_assignment_history where site_id = sid;
  delete from public.boarder_profiles where site_id = sid;
  delete from public.tenants where site_id = sid;
end $$;
