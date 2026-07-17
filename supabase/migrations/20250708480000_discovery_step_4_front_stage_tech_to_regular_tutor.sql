-- Discovery (Application) — connect Front Stage Tech to Regular Tutor in step 4.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000078018',
    'a0000000-0000-4000-8000-000000070406',
    'a0000000-0000-4000-8000-000000070403'
  ),
  (
    'a0000000-0000-4000-8000-000000728018',
    'a0000000-0000-4000-8000-000000720406',
    'a0000000-0000-4000-8000-000000720403'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
