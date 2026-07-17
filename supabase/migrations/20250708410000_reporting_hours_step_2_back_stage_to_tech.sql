-- Reporting Hours — connect step 2 Back Stage Actions to Back Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098085',
  'a0000000-0000-4000-8000-0000001e0207',
  'a0000000-0000-4000-8000-0000001e0208'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
