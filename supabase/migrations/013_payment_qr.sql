-- Owner payment QR and bank/e-wallet details shown to all boarders.
-- Run AFTER 005_billing.sql. Safe to re-run.
-- Slug hm-dormitory already has a billing_settings row from 005.

alter table public.billing_settings
  add column if not exists payment_qr_url text;

alter table public.billing_settings
  add column if not exists payment_account_name text;

alter table public.billing_settings
  add column if not exists payment_account_number text;

alter table public.billing_settings
  add column if not exists payment_notes text;

drop policy if exists "Read billing settings" on public.billing_settings;
create policy "Read billing settings"
on public.billing_settings for select to authenticated
using (
  public.is_ops_staff(site_id)
  or public.is_boarder_for_site(site_id)
);
