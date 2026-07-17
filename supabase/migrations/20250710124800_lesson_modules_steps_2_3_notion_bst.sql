-- Lesson Modules Happy Path — add Notion as Back Stage Tech on steps 2 and 3.

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000120208',
    'a0000000-0000-4000-8000-000000000802',
    'a0000000-0000-4000-8000-000000001245',
    'a0000000-0000-4000-8000-000000000862',
    'Notion'
  ),
  (
    'a0000000-0000-4000-8000-000000120308',
    'a0000000-0000-4000-8000-000000000802',
    'a0000000-0000-4000-8000-000000001245',
    'a0000000-0000-4000-8000-000000000863',
    'Notion'
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;
