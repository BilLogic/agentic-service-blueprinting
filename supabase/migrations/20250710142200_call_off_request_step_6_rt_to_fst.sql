-- Call-off Request step 6: Regular Tutor → Front Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000095016',
  'a0000000-0000-4000-8000-000000170603',
  'a0000000-0000-4000-8000-000000170606'
)
on conflict (id) do update
set source_cell_id = excluded.source_cell_id,
    target_cell_id = excluded.target_cell_id;
