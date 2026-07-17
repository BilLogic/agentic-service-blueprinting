-- Lesson Modules Happy Path — Back Stage Actions → Back Stage Tech on steps 2–3.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000090032',
    'a0000000-0000-4000-8000-000000120207',
    'a0000000-0000-4000-8000-000000120208'
  ),
  (
    'a0000000-0000-4000-8000-000000090033',
    'a0000000-0000-4000-8000-000000120307',
    'a0000000-0000-4000-8000-000000120308'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
