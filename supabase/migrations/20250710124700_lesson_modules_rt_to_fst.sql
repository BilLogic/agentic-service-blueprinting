-- Lesson Modules Happy Path — Regular Tutor → Front Stage Tech on steps 1–3.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000090001',
    'a0000000-0000-4000-8000-000000120103',
    'a0000000-0000-4000-8000-000000120106'
  ),
  (
    'a0000000-0000-4000-8000-000000090002',
    'a0000000-0000-4000-8000-000000120203',
    'a0000000-0000-4000-8000-000000120206'
  ),
  (
    'a0000000-0000-4000-8000-000000090003',
    'a0000000-0000-4000-8000-000000120303',
    'a0000000-0000-4000-8000-000000120306'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
