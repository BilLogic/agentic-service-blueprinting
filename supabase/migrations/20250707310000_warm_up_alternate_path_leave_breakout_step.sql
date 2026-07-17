-- Warm-Up Alternate Path: insert Leave Breakout Room between Mark Student Helped and Move to Next Student.

update public.path_steps
set column_position = 99
where path_id = 'a0000000-0000-4000-8000-000000000350'
  and step_id = 'a0000000-0000-4000-8000-000000000318';

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-000000000350',
  'a0000000-0000-4000-8000-000000000319',
  7
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

update public.path_steps
set column_position = 8
where path_id = 'a0000000-0000-4000-8000-000000000350'
  and step_id = 'a0000000-0000-4000-8000-000000000318';

update public.cells
set
  step_id = 'a0000000-0000-4000-8000-000000000319',
  content = 'Leave breakout room'
where id = 'a0000000-0000-4000-8000-000000060803';

update public.cells
set
  step_id = 'a0000000-0000-4000-8000-000000000319',
  content = E'Zoom/Pencil'
where id = 'a0000000-0000-4000-8000-000000060806';

update public.cells
set step_id = 'a0000000-0000-4000-8000-000000000319'
where id = 'a0000000-0000-4000-8000-000000060810';

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000060809'
   or target_cell_id = 'a0000000-0000-4000-8000-000000060809';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000060809';

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000060903',
    'a0000000-0000-4000-8000-000000000350',
    'a0000000-0000-4000-8000-000000000403',
    'a0000000-0000-4000-8000-000000000318',
    'Move on to the next student in sorted order set by researchers'
  ),
  (
    'a0000000-0000-4000-8000-000000060906',
    'a0000000-0000-4000-8000-000000000350',
    'a0000000-0000-4000-8000-000000000406',
    'a0000000-0000-4000-8000-000000000318',
    E'Zoom/Pencil\nPLUS App'
  ),
  (
    'a0000000-0000-4000-8000-000000060909',
    'a0000000-0000-4000-8000-000000000350',
    'a0000000-0000-4000-8000-000000000409',
    'a0000000-0000-4000-8000-000000000318',
    E'Researchers set student order\nDev Team\nDesign team'
  ),
  (
    'a0000000-0000-4000-8000-000000060910',
    'a0000000-0000-4000-8000-000000000350',
    'a0000000-0000-4000-8000-000000000410',
    'a0000000-0000-4000-8000-000000000318',
    ''
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

update public.cell_triggers
set source_cell_id = 'a0000000-0000-4000-8000-000000060903'
where id = 'a0000000-0000-4000-8000-000000070112';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000070108',
    'a0000000-0000-4000-8000-000000060803',
    'a0000000-0000-4000-8000-000000060903'
  ),
  (
    'a0000000-0000-4000-8000-000000070120',
    'a0000000-0000-4000-8000-000000060903',
    'a0000000-0000-4000-8000-000000060906'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000060803',
  target_cell_id = 'a0000000-0000-4000-8000-000000060806'
where id = 'a0000000-0000-4000-8000-000000070119';
