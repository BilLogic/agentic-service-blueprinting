-- Warm-Up Happy Path: insert Leave Breakout Room between Mark Student Helped and Move to Next Student.

insert into public.steps (id, service_scenario_id, name)
values (
  'a0000000-0000-4000-8000-000000000319',
  'a0000000-0000-4000-8000-000000000203',
  'Leave Breakout Room'
)
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

update public.path_steps
set column_position = 9
where path_id = 'a0000000-0000-4000-8000-000000000300'
  and step_id = 'a0000000-0000-4000-8000-000000000318';

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-000000000300',
  'a0000000-0000-4000-8000-000000000319',
  8
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

update public.cells
set
  step_id = 'a0000000-0000-4000-8000-000000000319',
  content = 'Leave breakout room'
where id = 'a0000000-0000-4000-8000-000000040803';

update public.cells
set
  step_id = 'a0000000-0000-4000-8000-000000000319',
  content = E'Zoom/Pencil'
where id = 'a0000000-0000-4000-8000-000000040806';

update public.cells
set step_id = 'a0000000-0000-4000-8000-000000000319'
where id = 'a0000000-0000-4000-8000-000000040810';

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000040809'
   or target_cell_id = 'a0000000-0000-4000-8000-000000040809';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000040809';

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000040903',
    'a0000000-0000-4000-8000-000000000300',
    'a0000000-0000-4000-8000-000000000303',
    'a0000000-0000-4000-8000-000000000318',
    'Move on to the next student in sorted order set by researchers'
  ),
  (
    'a0000000-0000-4000-8000-000000040906',
    'a0000000-0000-4000-8000-000000000300',
    'a0000000-0000-4000-8000-000000000306',
    'a0000000-0000-4000-8000-000000000318',
    E'Zoom/Pencil\nPLUS App'
  ),
  (
    'a0000000-0000-4000-8000-000000040909',
    'a0000000-0000-4000-8000-000000000300',
    'a0000000-0000-4000-8000-000000000309',
    'a0000000-0000-4000-8000-000000000318',
    E'Researchers set student order\nDev Team\nDesign team'
  ),
  (
    'a0000000-0000-4000-8000-000000040910',
    'a0000000-0000-4000-8000-000000000300',
    'a0000000-0000-4000-8000-000000000310',
    'a0000000-0000-4000-8000-000000000318',
    ''
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

update public.cell_triggers
set source_cell_id = 'a0000000-0000-4000-8000-000000040903'
where id = 'a0000000-0000-4000-8000-000000050112';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000050108',
    'a0000000-0000-4000-8000-000000040803',
    'a0000000-0000-4000-8000-000000040903'
  ),
  (
    'a0000000-0000-4000-8000-000000050121',
    'a0000000-0000-4000-8000-000000040903',
    'a0000000-0000-4000-8000-000000040906'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
