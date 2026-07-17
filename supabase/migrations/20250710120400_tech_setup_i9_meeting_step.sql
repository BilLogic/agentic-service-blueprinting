-- Tech Setup — insert I-9 meeting step (Regular Tutor) between Send clearances and Payroll setup.

insert into public.steps (id, service_scenario_id, name)
values (
  'a0000000-0000-4000-8000-000000000826',
  'a0000000-0000-4000-8000-000000000120',
  'I-9 meeting'
)
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

-- Shift columns to make room at position 4.
update public.path_steps
set column_position = 99
where path_id = 'a0000000-0000-4000-8000-000000000800'
  and step_id = 'a0000000-0000-4000-8000-000000000825';

update public.path_steps
set column_position = 6
where path_id = 'a0000000-0000-4000-8000-000000000800'
  and step_id = 'a0000000-0000-4000-8000-000000000825';

update public.path_steps
set column_position = 5
where path_id = 'a0000000-0000-4000-8000-000000000800'
  and step_id = 'a0000000-0000-4000-8000-000000000824';

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-000000000800',
  'a0000000-0000-4000-8000-000000000826',
  4
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

-- Drop triggers that reference cells being renumbered.
delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000088013',
  'a0000000-0000-4000-8000-000000088014',
  'a0000000-0000-4000-8000-000000088041',
  'a0000000-0000-4000-8000-000000088051'
);

-- Move Join Slack cells to step slot 06.
update public.cells set id = 'a0000000-0000-4000-8000-000000100610' where id = 'a0000000-0000-4000-8000-000000100510';
update public.cells set id = 'a0000000-0000-4000-8000-000000100603' where id = 'a0000000-0000-4000-8000-000000100503';
update public.cells set id = 'a0000000-0000-4000-8000-000000100604' where id = 'a0000000-0000-4000-8000-000000100504';
update public.cells set id = 'a0000000-0000-4000-8000-000000100606' where id = 'a0000000-0000-4000-8000-000000100506';

-- Move Payroll setup cells to step slot 05.
update public.cells set id = 'a0000000-0000-4000-8000-000000100510' where id = 'a0000000-0000-4000-8000-000000100410';
update public.cells set id = 'a0000000-0000-4000-8000-000000100503' where id = 'a0000000-0000-4000-8000-000000100403';
update public.cells set id = 'a0000000-0000-4000-8000-000000100504' where id = 'a0000000-0000-4000-8000-000000100404';
update public.cells set id = 'a0000000-0000-4000-8000-000000100506' where id = 'a0000000-0000-4000-8000-000000100406';
update public.cells set id = 'a0000000-0000-4000-8000-000000100507' where id = 'a0000000-0000-4000-8000-000000100407';
update public.cells set id = 'a0000000-0000-4000-8000-000000100508' where id = 'a0000000-0000-4000-8000-000000100408';
update public.cells set id = 'a0000000-0000-4000-8000-000000100509' where id = 'a0000000-0000-4000-8000-000000100409';

-- New step 4 — I-9 meeting (Regular Tutor only).
insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000100410',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000818',
    'a0000000-0000-4000-8000-000000000826',
    ''
  ),
  (
    'a0000000-0000-4000-8000-000000100403',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000831',
    'a0000000-0000-4000-8000-000000000826',
    'Sets up I-9 meeting with CMU HR Department'
  )
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000088013',
    'a0000000-0000-4000-8000-000000100303',
    'a0000000-0000-4000-8000-000000100403'
  ),
  (
    'a0000000-0000-4000-8000-000000088014',
    'a0000000-0000-4000-8000-000000100403',
    'a0000000-0000-4000-8000-000000100503'
  ),
  (
    'a0000000-0000-4000-8000-000000088015',
    'a0000000-0000-4000-8000-000000100503',
    'a0000000-0000-4000-8000-000000100603'
  ),
  (
    'a0000000-0000-4000-8000-000000088041',
    'a0000000-0000-4000-8000-000000100503',
    'a0000000-0000-4000-8000-000000100504'
  ),
  (
    'a0000000-0000-4000-8000-000000088051',
    'a0000000-0000-4000-8000-000000100604',
    'a0000000-0000-4000-8000-000000100603'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
