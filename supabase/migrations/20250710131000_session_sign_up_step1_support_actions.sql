-- Session Sign Up step 1: add Support Actions (Dev Team / Design Team).

insert into public.cells (id, path_id, layer_id, step_id, content, description)
values (
  'a0000000-0000-4000-8000-000000130109',
  'a0000000-0000-4000-8000-000000000805',
  'a0000000-0000-4000-8000-000000000884',
  'a0000000-0000-4000-8000-000000000891',
  E'Dev Team\nDesign Team',
  'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
)
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content,
  description = excluded.description;
