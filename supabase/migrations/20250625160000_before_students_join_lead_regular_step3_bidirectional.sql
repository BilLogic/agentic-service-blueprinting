-- Before Students Join: bidirectional Lead Tutor ↔ Regular Tutor at step 3

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000096033',
    'a0000000-0000-4000-8000-000000180302',
    'a0000000-0000-4000-8000-000000180303'
  ),
  (
    'a0000000-0000-4000-8000-000000096034',
    'a0000000-0000-4000-8000-000000180303',
    'a0000000-0000-4000-8000-000000180302'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
