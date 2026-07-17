-- Warm-Up Happy Path: step 1 → step 2 triggers (Partner, Lead, Regular Tutor)
insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000050108',
    'a0000000-0000-4000-8000-000000040101',
    'a0000000-0000-4000-8000-000000040201'
  ),
  (
    'a0000000-0000-4000-8000-000000050109',
    'a0000000-0000-4000-8000-000000040102',
    'a0000000-0000-4000-8000-000000040202'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
