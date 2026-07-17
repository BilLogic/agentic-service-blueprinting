-- Lesson Modules Happy Path — add Back Stage Actions to steps 2 and 3.

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000120207',
    'a0000000-0000-4000-8000-000000000802',
    'a0000000-0000-4000-8000-000000001244',
    'a0000000-0000-4000-8000-000000000862',
    'Instructional design team designs and maintains lessons'
  ),
  (
    'a0000000-0000-4000-8000-000000120307',
    'a0000000-0000-4000-8000-000000000802',
    'a0000000-0000-4000-8000-000000001244',
    'a0000000-0000-4000-8000-000000000863',
    'Instructional design team designs and maintains lessons'
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;
