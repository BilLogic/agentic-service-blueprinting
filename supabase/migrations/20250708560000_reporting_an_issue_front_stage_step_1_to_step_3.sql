-- Reporting an Issue — connect Front Stage Actions step 1 to step 3.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098078',
  'a0000000-0000-4000-8000-0000001d0104',
  'a0000000-0000-4000-8000-0000001d0304'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
