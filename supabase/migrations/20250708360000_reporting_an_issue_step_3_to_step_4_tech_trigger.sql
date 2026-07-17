-- Reporting an Issue — connect step 3 Front Stage Actions to step 4 Front Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098077',
  'a0000000-0000-4000-8000-0000001d0304',
  'a0000000-0000-4000-8000-0000001d0406'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
