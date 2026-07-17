-- Tech Setup step 3 — add Front Stage Tech (Email) between tutor and supervisor.

insert into public.cells (id, path_id, layer_id, step_id, content)
values (
  'a0000000-0000-4000-8000-000000100306',
  'a0000000-0000-4000-8000-000000000800',
  'a0000000-0000-4000-8000-000000000833',
  'a0000000-0000-4000-8000-000000000823',
  'Email'
)
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000100303',
  target_cell_id = 'a0000000-0000-4000-8000-000000100306'
where id = 'a0000000-0000-4000-8000-000000088031';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000088032',
  'a0000000-0000-4000-8000-000000100306',
  'a0000000-0000-4000-8000-000000100304'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
