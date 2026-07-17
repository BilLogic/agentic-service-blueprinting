-- Reporting Hours — Back Stage Tech step 2 → Front Stage Tech step 3.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098086',
  'a0000000-0000-4000-8000-0000001e0308',
  'a0000000-0000-4000-8000-0000001e0206'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
