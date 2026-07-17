-- Reporting an Issue — connect Follow up tutors to Resolve concern Back Stage Actions.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000098079',
    'a0000000-0000-4000-8000-0000001d0402',
    'a0000000-0000-4000-8000-0000001d0207'
  ),
  (
    'a0000000-0000-4000-8000-000000098080',
    'a0000000-0000-4000-8000-0000001d0403',
    'a0000000-0000-4000-8000-0000001d0207'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
