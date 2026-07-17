-- Reporting Hours — Front Stage Tech step 1 → Back Stage Actions step 2.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098094',
  'a0000000-0000-4000-8000-0000001e0106',
  'a0000000-0000-4000-8000-0000001e0307'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
