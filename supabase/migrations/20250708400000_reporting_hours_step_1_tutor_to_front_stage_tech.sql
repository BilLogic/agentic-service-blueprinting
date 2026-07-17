-- Reporting Hours — route step 1 tutors through Front Stage Tech (Workday).

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000098080',
    'a0000000-0000-4000-8000-0000001e0103',
    'a0000000-0000-4000-8000-0000001e0106'
  ),
  (
    'a0000000-0000-4000-8000-000000098082',
    'a0000000-0000-4000-8000-0000001e0102',
    'a0000000-0000-4000-8000-0000001e0106'
  ),
  (
    'a0000000-0000-4000-8000-000000098084',
    'a0000000-0000-4000-8000-0000001e0106',
    'a0000000-0000-4000-8000-0000001e0207'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
