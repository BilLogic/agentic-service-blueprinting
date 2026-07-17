-- Before Students Join step 5 — PLUS App on Front Stage Tech; add Support Actions cell

update public.cells
set content = 'PLUS App, Zoom/Pencil'
where id = 'a0000000-0000-4000-8000-000000180506';

insert into public.cells (id, path_id, layer_id, step_id, content, description)
values (
  'a0000000-0000-4000-8000-000000180509',
  'a0000000-0000-4000-8000-000000000809',
  'a0000000-0000-4000-8000-000000002018',
  'a0000000-0000-4000-8000-000000000954',
  E'Dev Team\nDesign team',
  'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
)
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content,
  description = excluded.description;
