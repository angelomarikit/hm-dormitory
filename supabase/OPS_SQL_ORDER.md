# HM Dormitory operations SQL — run order

Run these in the **Supabase SQL Editor**, one file at a time, on the same project as the live website. Do **not** skip files. Each script is written to be re-runnable where practical.

**Do not paste the service role key into the website.** These scripts only use Postgres roles already in your project (`anon`, `authenticated`).

## Already applied (existing site)

1. `migrations/001_initial_schema.sql` (or `schema.sql`)
2. `migrations/002_tenants_and_standard_rooms.sql`
3. `migrations/003_third_floor_room_311.sql`

## Operations upgrade

4. **`migrations/004_ops_foundation.sql`** — roles, beds, registrations, private storage, RLS helpers  
   Confirm beds appear (one per room capacity) and `/register` can save applications before continuing.

5. **`migrations/005_billing.sql`** — monthly bills, rent in centavos, generate-bills function

6. **`migrations/006_payments.sql`** — payments, receipts, confirm/reject RPCs, cash collections

7. **`migrations/007_comms.sql`** — private notices, messaging, maintenance, activity logs

8. **`migrations/008_bed_billing.sql`** — rent lives on each bed; Generate month bills only boarders assigned to a bed

## After each file

In the SQL Editor, check there is no error. Then tell the app it is safe to use the new tables (refresh admin after 004).

## Assigning a caretaker (after 004)

Use the same pattern as `assign-hm-dormitory-admin.sql`, with `role = 'caretaker'` instead of `'owner'`.
