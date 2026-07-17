-- Goal Setting Happy Path — step 5 Back Stage Actions cell.

insert into public.cells (id, path_id, layer_id, step_id, content)
values (
  'a0000000-0000-4000-8000-0000001a0507',
  'a0000000-0000-4000-8000-00000000080c',
  'a0000000-0000-4000-8000-000000000854',
  'a0000000-0000-4000-8000-000000000984',
  'Researcher sets goal setting activities'
)
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;
