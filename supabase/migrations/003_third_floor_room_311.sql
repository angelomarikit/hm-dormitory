-- Add third-floor room 311 (same 4-person small room as 301-310) and study-area description.
-- Safe to re-run.

update public.floors
set
  description = 'Eleven small rooms, each holding 4 boarders, plus a study area.',
  is_active = true
where floor_number = 3
  and site_id = (select id from public.sites where slug = 'hm-dormitory');

insert into public.rooms (
  site_id,
  floor_id,
  room_number,
  room_name,
  capacity,
  room_type,
  sort_order,
  is_active,
  occupied_spaces
)
select
  s.id,
  f.id,
  '311',
  'Small room',
  4,
  'small',
  311,
  true,
  0
from public.sites s
join public.floors f
  on f.site_id = s.id
 and f.floor_number = 3
where s.slug = 'hm-dormitory'
on conflict (site_id, room_number) do update
set
  floor_id = excluded.floor_id,
  room_name = excluded.room_name,
  capacity = excluded.capacity,
  room_type = excluded.room_type,
  sort_order = excluded.sort_order,
  is_active = true;
