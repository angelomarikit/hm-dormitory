-- WAVE 6 — Notices, messaging, maintenance, activity logs. Run after 006.

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'general',
  priority text not null default 'normal',
  audience text not null default 'all_boarders',
  room_id uuid references public.rooms (id) on delete set null,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notices_category_check check (
    category in ('general', 'payment', 'maintenance', 'rules', 'emergency', 'other')
  ),
  constraint notices_priority_check check (priority in ('normal', 'high', 'urgent')),
  constraint notices_audience_check check (
    audience in ('all_boarders', 'room', 'selected', 'individual')
  )
);

drop trigger if exists trg_notices_updated_at on public.notices;
create trigger trg_notices_updated_at
before update on public.notices
for each row execute function public.set_updated_at();

create table if not exists public.notice_recipients (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  read_at timestamptz,
  unique (notice_id, tenant_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  category text not null default 'general',
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint conversations_tenant_unique unique (site_id, tenant_id)
);

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  client_key text,
  constraint messages_body_not_blank check (length(trim(body)) > 0)
);

create unique index if not exists idx_messages_client_key
  on public.messages (sender_id, client_key)
  where client_key is not null;

create table if not exists public.message_read_states (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  title text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint maintenance_status_check check (status in ('open', 'in_progress', 'resolved', 'cancelled'))
);

drop trigger if exists trg_maintenance_updated_at on public.maintenance_requests;
create trigger trg_maintenance_updated_at
before update on public.maintenance_requests
for each row execute function public.set_updated_at();

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  detail text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_activity_logs_site on public.activity_logs (site_id, created_at desc);

create or replace function public.log_activity(
  p_site_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_detail text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_logs (site_id, actor_id, action, entity_type, entity_id, detail)
  values (p_site_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_detail);
$$;

grant execute on function public.log_activity(uuid, text, text, uuid, text) to authenticated;

-- RLS
alter table public.notices enable row level security;
alter table public.notices force row level security;
alter table public.notice_recipients enable row level security;
alter table public.notice_recipients force row level security;
alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.message_read_states enable row level security;
alter table public.message_read_states force row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_requests force row level security;
alter table public.activity_logs enable row level security;
alter table public.activity_logs force row level security;

create or replace function public.boarder_can_read_notice(p_notice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notice_recipients nr
    join public.tenants t on t.id = nr.tenant_id
    where nr.notice_id = p_notice_id
      and t.user_id = auth.uid()
  );
$$;

create or replace function public.notice_is_cms_managed(p_notice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notices n
    where n.id = p_notice_id
      and public.is_cms_staff(n.site_id)
  );
$$;

grant execute on function public.boarder_can_read_notice(uuid) to authenticated, anon;
grant execute on function public.notice_is_cms_managed(uuid) to authenticated, anon;

drop policy if exists "Staff manage notices" on public.notices;
create policy "Staff manage notices"
on public.notices for all to authenticated
using (public.is_cms_staff(site_id))
with check (public.is_cms_staff(site_id));

drop policy if exists "Ops read notices" on public.notices;
create policy "Ops read notices"
on public.notices for select to authenticated
using (public.is_ops_staff(site_id));

drop policy if exists "Boarders read published notices" on public.notices;
create policy "Boarders read published notices"
on public.notices for select to authenticated
using (
  published_at is not null
  and (expires_at is null or expires_at > timezone('utc', now()))
  and public.is_boarder_for_site(site_id)
  and (
    audience = 'all_boarders'
    or public.boarder_can_read_notice(id)
  )
);

drop policy if exists "Staff notice recipients" on public.notice_recipients;
create policy "Staff notice recipients"
on public.notice_recipients for all to authenticated
using (public.notice_is_cms_managed(notice_id))
with check (public.notice_is_cms_managed(notice_id));

drop policy if exists "Boarder notice recipients" on public.notice_recipients;
create policy "Boarder notice recipients"
on public.notice_recipients for select to authenticated
using (
  exists (select 1 from public.tenants t where t.id = tenant_id and t.user_id = auth.uid())
);

drop policy if exists "Boarder mark notice read" on public.notice_recipients;
create policy "Boarder mark notice read"
on public.notice_recipients for update to authenticated
using (exists (select 1 from public.tenants t where t.id = tenant_id and t.user_id = auth.uid()))
with check (exists (select 1 from public.tenants t where t.id = tenant_id and t.user_id = auth.uid()));

drop policy if exists "Read conversations" on public.conversations;
create policy "Read conversations"
on public.conversations for select to authenticated
using (
  public.is_ops_staff(site_id)
  or exists (select 1 from public.tenants t where t.id = tenant_id and t.user_id = auth.uid())
);

drop policy if exists "Boarder insert conversation" on public.conversations;
create policy "Boarder insert conversation"
on public.conversations for insert to authenticated
with check (
  exists (
    select 1 from public.tenants t
    where t.id = conversations.tenant_id
      and t.user_id = auth.uid()
      and t.site_id = conversations.site_id
  )
  or public.is_ops_staff(conversations.site_id)
);

drop policy if exists "Staff update conversations" on public.conversations;
create policy "Staff update conversations"
on public.conversations for update to authenticated
using (public.is_ops_staff(site_id))
with check (public.is_ops_staff(site_id));

drop policy if exists "Read messages" on public.messages;
create policy "Read messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (
        public.is_ops_staff(c.site_id)
        or exists (select 1 from public.tenants t where t.id = c.tenant_id and t.user_id = auth.uid())
      )
  )
);

drop policy if exists "Send messages" on public.messages;
create policy "Send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and c.site_id = messages.site_id
      and (
        public.is_ops_staff(c.site_id)
        or exists (select 1 from public.tenants t where t.id = c.tenant_id and t.user_id = auth.uid())
      )
  )
);

drop policy if exists "Read states" on public.message_read_states;
create policy "Read states"
on public.message_read_states for all to authenticated
using (user_id = auth.uid() or public.is_ops_staff((
  select site_id from public.conversations c where c.id = conversation_id
)))
with check (user_id = auth.uid());

drop policy if exists "Maintenance read" on public.maintenance_requests;
create policy "Maintenance read"
on public.maintenance_requests for select to authenticated
using (
  public.is_ops_staff(site_id)
  or exists (select 1 from public.tenants t where t.id = tenant_id and t.user_id = auth.uid())
);

drop policy if exists "Boarder insert maintenance" on public.maintenance_requests;
create policy "Boarder insert maintenance"
on public.maintenance_requests for insert to authenticated
with check (
  exists (
    select 1 from public.tenants t
    where t.id = maintenance_requests.tenant_id
      and t.user_id = auth.uid()
      and t.site_id = maintenance_requests.site_id
  )
);

drop policy if exists "Ops update maintenance" on public.maintenance_requests;
create policy "Ops update maintenance"
on public.maintenance_requests for update to authenticated
using (public.is_ops_staff(site_id))
with check (public.is_ops_staff(site_id));

drop policy if exists "Staff read activity" on public.activity_logs;
create policy "Staff read activity"
on public.activity_logs for select to authenticated
using (public.is_cms_staff(site_id));

drop policy if exists "Staff insert activity" on public.activity_logs;
create policy "Staff insert activity"
on public.activity_logs for insert to authenticated
with check (public.is_cms_staff(site_id));

grant select, insert, update on public.notices to authenticated;
grant select, insert, update on public.notice_recipients to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.message_read_states to authenticated;
grant select, insert, update on public.maintenance_requests to authenticated;
grant select, insert on public.activity_logs to authenticated;
