-- Post-session scenarios: add Lead Tutor layer with same cells as Regular Tutor.

-- Reporting an Issue (path 80f)
insert into public.layers (id, path_id, name, row_position)
values (
  'a0000000-0000-4000-8000-000000000917',
  'a0000000-0000-4000-8000-00000000080f',
  'Lead Tutor',
  1
)
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position,
  path_id = excluded.path_id;

update public.layers set row_position = 2 where id = 'a0000000-0000-4000-8000-000000000911';
update public.layers set row_position = 3 where id = 'a0000000-0000-4000-8000-000000000912';
update public.layers set row_position = 4 where id = 'a0000000-0000-4000-8000-000000000913';
update public.layers set row_position = 5 where id = 'a0000000-0000-4000-8000-000000000914';
update public.layers set row_position = 6 where id = 'a0000000-0000-4000-8000-000000000915';
update public.layers set row_position = 7 where id = 'a0000000-0000-4000-8000-000000000916';

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-0000001d0102',
    'a0000000-0000-4000-8000-00000000080f',
    'a0000000-0000-4000-8000-000000000917',
    'a0000000-0000-4000-8000-000000000988',
    'Reach out to PLUS staff with any concerns'
  ),
  (
    'a0000000-0000-4000-8000-0000001d0402',
    'a0000000-0000-4000-8000-00000000080f',
    'a0000000-0000-4000-8000-000000000917',
    'a0000000-0000-4000-8000-000000000993',
    'Processes request and follows up on request'
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000098074',
    'a0000000-0000-4000-8000-0000001d0102',
    'a0000000-0000-4000-8000-0000001d0104'
  ),
  (
    'a0000000-0000-4000-8000-000000098075',
    'a0000000-0000-4000-8000-0000001d0304',
    'a0000000-0000-4000-8000-0000001d0402'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

-- Reporting Hours (path 812)
insert into public.layers (id, path_id, name, row_position)
values (
  'a0000000-0000-4000-8000-000000000927',
  'a0000000-0000-4000-8000-000000000812',
  'Lead Tutor',
  1
)
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position,
  path_id = excluded.path_id;

update public.layers set row_position = 2 where id = 'a0000000-0000-4000-8000-000000000921';
update public.layers set row_position = 3 where id = 'a0000000-0000-4000-8000-000000000922';
update public.layers set row_position = 4 where id = 'a0000000-0000-4000-8000-000000000923';
update public.layers set row_position = 5 where id = 'a0000000-0000-4000-8000-000000000924';
update public.layers set row_position = 6 where id = 'a0000000-0000-4000-8000-000000000925';
update public.layers set row_position = 7 where id = 'a0000000-0000-4000-8000-000000000926';

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-0000001e0102',
    'a0000000-0000-4000-8000-000000000812',
    'a0000000-0000-4000-8000-000000000927',
    'a0000000-0000-4000-8000-000000000992',
    'Report Hours by Week Deadline'
  ),
  (
    'a0000000-0000-4000-8000-0000001e0302',
    'a0000000-0000-4000-8000-000000000812',
    'a0000000-0000-4000-8000-000000000927',
    'a0000000-0000-4000-8000-000000000995',
    'Receive Biweekly Paycheck'
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000098082',
    'a0000000-0000-4000-8000-0000001e0102',
    'a0000000-0000-4000-8000-0000001e0207'
  ),
  (
    'a0000000-0000-4000-8000-000000098083',
    'a0000000-0000-4000-8000-0000001e0207',
    'a0000000-0000-4000-8000-0000001e0302'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
