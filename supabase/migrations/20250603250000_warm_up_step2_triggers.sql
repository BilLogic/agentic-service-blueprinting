-- Warm-Up Happy Path: step 2 → step 3 triggers (Partner Action: Teacher, Lead Tutor)

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000050110',
    'a0000000-0000-4000-8000-000000040201',
    'a0000000-0000-4000-8000-000000040301'
  ),
  (
    'a0000000-0000-4000-8000-000000050111',
    'a0000000-0000-4000-8000-000000040202',
    'a0000000-0000-4000-8000-000000040302'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
