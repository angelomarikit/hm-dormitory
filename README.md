# Apex Landing Platform — HM Dormitory

Multi-tenant landing page and admin system. HM Dormitory is the first client. The same codebase and **one Supabase project** can serve future landing-page clients, each isolated by `site_id` and Row Level Security.

## LOCAL SETUP

1. Copy environment variables:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

2. Fill in `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITE_SLUG=hm-dormitory
```

3. Install and run:

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

The public site loads the row in `sites` whose `slug` matches `VITE_SITE_SLUG`. Do not hardcode site UUIDs in the app.

## SUPABASE SETUP

1. Create a Supabase project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor**.
3. Paste and run the full contents of:

```text
supabase/schema.sql
```

This file is the same as `supabase/migrations/001_initial_schema.sql`.

4. Confirm these tables exist: `sites`, `site_members`, `platform_admins`, `announcements`, `floors`, `rooms`, `room_images`, `amenities`, `rates`, `faqs`, `house_rules`.
5. Confirm RLS is enabled on those tables (Table Editor → a table → RLS).
6. Confirm Storage bucket `site-assets` exists and is public for reads.
7. Open **Authentication → Providers** and keep **Email** enabled. Do **not** enable public sign-ups if you can avoid it. Administrators are created manually.
8. Create the HM Dormitory admin account (next section).
9. Run `supabase/assign-hm-dormitory-admin.sql` after replacing the email placeholder with that user’s email.
10. Sign in at `/admin` with that email and password. You should land on `/admin/dashboard`.

### Assign an Auth user to HM Dormitory

Replace the email with the administrator you created in Authentication → Users:

```sql
insert into public.site_members (
  site_id,
  user_id,
  role
)
select
  s.id,
  u.id,
  'owner'
from public.sites s
join auth.users u
  on lower(u.email) = lower('you@example.com')
where s.slug = 'hm-dormitory'
on conflict (site_id, user_id) do update
set role = excluded.role;
```

If you prefer to use the user UUID from Authentication → Users:

```sql
insert into public.site_members (
  site_id,
  user_id,
  role
)
select
  id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner'
from public.sites
where slug = 'hm-dormitory';
```

Do not run the UUID version with the placeholder text still in it. PostgreSQL will reject anything that is not a real UUID.

Supported roles: `owner`, `admin`, `editor`. They currently have the same management access.

## DATABASE SQL

Run **one** of these (they are identical):

- `supabase/schema.sql`
- `supabase/migrations/001_initial_schema.sql`

The SQL creates tables, constraints, indexes, `updated_at` triggers, helper functions (`is_site_member`, `is_platform_admin`), RLS policies, grants, the `site-assets` bucket, Storage policies, the HM Dormitory site, Ground / Second / Third floors, and an empty rates row.

It does **not** invent official rates, contact details, house rules, amenities, or rooms.

## SUPABASE KEYS

In the Supabase dashboard:

1. Open **Project Settings → Data API** (or **API**).
2. Copy **Project URL** into `VITE_SUPABASE_URL`.
3. Copy the **anon / publishable** key into `VITE_SUPABASE_PUBLISHABLE_KEY`.

Never put the **service role** key in this frontend or in Vercel env vars for this app.

Local file: `.env.local`  
Production: Vercel project environment variables.

## ADMIN CREATION

1. Supabase Dashboard → **Authentication → Users → Add user**.
2. Create the user with email and password. Confirm the email if the dashboard asks you to.
3. Open `supabase/assign-hm-dormitory-admin.sql`, replace `REPLACE_WITH_ADMIN_EMAIL@example.com` with that email, and run it in the SQL Editor.
4. Visit `/admin` on the HM Dormitory deployment and sign in.

There is no public registration page for administrators.

## STORAGE

Bucket name: `site-assets`.

Every object must live under the tenant folder:

```text
{site_id}/logo/...
{site_id}/hero/...
{site_id}/building/...
{site_id}/rooms/{room_id}/...
{site_id}/amenities/...
```

Example path:

```text
{site_id}/rooms/{room_id}/unique-filename.webp
```

Public visitors can read files. Authenticated members can upload, replace, and delete only inside their assigned `site_id` folder (Storage RLS).

Allowed types: JPG, JPEG, PNG, WebP. Maximum size: 5 MB.

## LOCAL TESTING

With `.env.local` set and the SQL applied:

| Check | How |
| --- | --- |
| Public homepage | Open `/`. Confirm name, hero, and empty sections hide cleanly. |
| Admin login | Open `/admin`. Wrong password shows an error. Correct member reaches the dashboard. |
| Announcement | `/admin/announcements` → add, publish, mark important → confirm it appears on `/`. |
| Room occupancy | `/admin/rooms` → add a room → use `+` / `-` → confirm public availability updates after refresh. |
| Image upload | Settings logo/hero or a room photo. Confirm it shows publicly. |
| FAQ | `/admin/faqs` → add → confirm accordion on `/`. |
| House rule | `/admin/house-rules` → add → confirm `/house-rules`. |
| Rates | `/admin/rates` → save → confirm Rates section on `/`. |

A user who is authenticated but **not** in `site_members` for this slug is signed out and denied access.

## SECURITY TESTING

Public visitors (anon key) can only read published/active content. They cannot insert, update, or delete.

To confirm tenant isolation:

1. In SQL Editor, create a second site:

```sql
insert into public.sites (name, slug, is_active)
values ('Test Client', 'test-client', true);
```

2. Create another Auth user and assign them only to `test-client`:

```sql
insert into public.site_members (site_id, user_id, role)
select id, 'PASTE_SECOND_USER_UUID'::uuid, 'admin'
from public.sites
where slug = 'test-client';
```

3. Add a test announcement or room on `test-client`.
4. Sign in as the HM Dormitory admin. You must not see or change `test-client` records in the UI.
5. Optional API check: while signed in as HM Dormitory, a direct update against a `test-client` row should fail because of RLS.

HM Dormitory and Test Client share one database. Isolation comes from `site_id` plus RLS, not from frontend filtering.

## PRODUCTION BUILD

```bash
npm run build
```

Preview locally:

```bash
npm run preview
```

## GITHUB DEPLOYMENT

```bash
git init
git add .
git commit -m "Initial HM Dormitory multi-tenant landing page"
```

Create a GitHub repository, then:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

`.env.local` is gitignored. Confirm it is not committed (`git status`).

## VERCEL DEPLOYMENT

1. Sign in at [https://vercel.com](https://vercel.com).
2. Import the GitHub repository.
3. Framework preset: **Vite**.
4. Root directory: repository root.
5. This repo includes `vercel.json` so routes such as `/admin` and `/rooms` load the Vite app instead of a 404.
6. Add environment variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITE_SLUG=hm-dormitory
```

7. Deploy.
8. Open the production URL and confirm the homepage.
9. Open `/admin` and sign in with the HM Dormitory admin.

Vite inlines `VITE_*` variables at build time. If you change them, redeploy.

## CUSTOM DOMAIN

1. Vercel project → **Settings → Domains**.
2. Add the client domain (example: `hmdormitory.com`).
3. Add the DNS records Vercel shows (usually an A record or CNAME) at the domain registrar.
4. Wait for verification.
5. Confirm HTTPS works on the homepage and `/admin`.

## FUTURE CLIENT DEPLOYMENT

Use the **same** Supabase project. Do not create a new database for each small landing page.

1. Insert a site:

```sql
insert into public.sites (name, slug, is_active)
values ('New Client Name', 'new-client-slug', true);
```

2. Create floors/rates only if that client needs them.
3. Create their Auth admin in Authentication → Users.
4. Connect them:

```sql
insert into public.site_members (site_id, user_id, role)
select id, 'PASTE_NEW_ADMIN_UUID'::uuid, 'owner'
from public.sites
where slug = 'new-client-slug';
```

5. Add their content in `/admin` after deploying with their slug, or via SQL.
6. Deploy this same codebase as a **second Vercel project** (or a second domain with its own env).
7. Set:

```env
VITE_SITE_SLUG=new-client-slug
```

plus the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
8. Attach their custom domain.

Their rows stay isolated by `site_id` and RLS. An HM Dormitory admin cannot manage the new client.

`platform_admins` is reserved for a future Apex Technology super-admin dashboard. Do not put client admins in that table.

## PROJECT STRUCTURE

```text
src/
  components/public|admin|ui
  pages/public|admin
  layouts/
  contexts/   SiteContext, AuthContext, ToastContext
  services/   all Supabase access
  lib/        supabase client, env
  types/
  utils/roomAvailability.ts
supabase/schema.sql
```
