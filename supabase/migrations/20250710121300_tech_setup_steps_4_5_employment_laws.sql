-- Tech Setup steps 4 & 5 — add Support Actions (Employment Laws).

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000100409',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000836',
    'a0000000-0000-4000-8000-000000000826',
    'Employment Laws'
  ),
  (
    'a0000000-0000-4000-8000-000000100509',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000836',
    'a0000000-0000-4000-8000-000000000827',
    'Employment Laws'
  )
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;
