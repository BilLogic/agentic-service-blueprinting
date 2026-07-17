-- Before Students Join: shift Regular Tutor step 4–5 cells to columns 5–6.

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000096022',
  'a0000000-0000-4000-8000-000000096023',
  'a0000000-0000-4000-8000-000000096031',
  'a0000000-0000-4000-8000-000000096032'
)
or source_cell_id = 'a0000000-0000-4000-8000-000000180403'
or target_cell_id = 'a0000000-0000-4000-8000-000000180403';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000180403'
  and path_id = 'a0000000-0000-4000-8000-000000000809';

update public.cells
set
  step_id = 'a0000000-0000-4000-8000-000000000954',
  content = 'review student list for session'
where id = 'a0000000-0000-4000-8000-000000000180503'
  and path_id = 'a0000000-0000-4000-8000-000000000809';

insert into public.cells (id, path_id, layer_id, step_id, content)
values (
  'a0000000-0000-4000-8000-000000180603',
  'a0000000-0000-4000-8000-000000000809',
  'a0000000-0000-4000-8000-000000000833',
  'a0000000-0000-4000-8000-000000000955',
  'receive breakout rooms from Lead tutor'
)
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000096022',
    'a0000000-0000-4000-8000-000000180303',
    'a0000000-0000-4000-8000-000000180503'
  ),
  (
    'a0000000-0000-4000-8000-000000096023',
    'a0000000-0000-4000-8000-000000180503',
    'a0000000-0000-4000-8000-000000180603'
  ),
  (
    'a0000000-0000-4000-8000-000000096031',
    'a0000000-0000-4000-8000-000000180502',
    'a0000000-0000-4000-8000-000000180503'
  ),
  (
    'a0000000-0000-4000-8000-000000096032',
    'a0000000-0000-4000-8000-000000180602',
    'a0000000-0000-4000-8000-000000180603'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
