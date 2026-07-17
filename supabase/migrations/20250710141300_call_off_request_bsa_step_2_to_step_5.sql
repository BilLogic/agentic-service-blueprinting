-- Call-off Request: connect Back Stage Actions step 2 → Back Stage Actions step 5.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000095011',
  'a0000000-0000-4000-8000-000000170207',
  'a0000000-0000-4000-8000-000000170507'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
