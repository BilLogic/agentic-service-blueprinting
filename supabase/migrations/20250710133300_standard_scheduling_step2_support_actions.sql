-- Standard Scheduling step 2: add Support Actions (Dev Team / Design Team).

insert into public.cells (id, path_id, layer_id, step_id, content)
values (
  'a0000000-0000-4000-8000-000000140209',
  'a0000000-0000-4000-8000-000000000806',
  'a0000000-0000-4000-8000-000000000895',
  'a0000000-0000-4000-8000-000000000896',
  E'Dev Team\nDesign Team'
)
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;
