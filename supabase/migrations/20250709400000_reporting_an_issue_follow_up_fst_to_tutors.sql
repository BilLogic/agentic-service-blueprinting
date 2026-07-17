-- Reporting an Issue — restore Front Stage Tech step 3 (Follow up) → tutor arrows.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000098073',
    'a0000000-0000-4000-8000-0000001d0406',
    'a0000000-0000-4000-8000-0000001d0403'
  ),
  (
    'a0000000-0000-4000-8000-000000098075',
    'a0000000-0000-4000-8000-0000001d0406',
    'a0000000-0000-4000-8000-0000001d0402'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
