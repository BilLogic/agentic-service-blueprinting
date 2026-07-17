-- Before Students Join steps 1–2: connect Back Stage Actions → Front Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000096061',
    'a0000000-0000-4000-8000-000000180107',
    'a0000000-0000-4000-8000-000000180106'
  ),
  (
    'a0000000-0000-4000-8000-000000096062',
    'a0000000-0000-4000-8000-000000180207',
    'a0000000-0000-4000-8000-000000180206'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
