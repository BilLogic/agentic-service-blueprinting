-- Tech Setup — insert Attend I-9 meeting step (Regular Tutor) between schedule and Payroll setup.

insert into public.steps (id, service_scenario_id, name)
values (
  'a0000000-0000-4000-8000-000000000827',
  'a0000000-0000-4000-8000-000000000120',
  'Attend I-9 meeting'
)
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

update public.path_steps
set column_position = 99
where path_id = 'a0000000-0000-4000-8000-000000000800'
  and step_id = 'a0000000-0000-4000-8000-000000000825';

update public.path_steps
set column_position = 7
where path_id = 'a0000000-0000-4000-8000-000000000800'
  and step_id = 'a0000000-0000-4000-8000-000000000825';

update public.path_steps
set column_position = 6
where path_id = 'a0000000-0000-4000-8000-000000000800'
  and step_id = 'a0000000-0000-4000-8000-000000000824';

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-000000000800',
  'a0000000-0000-4000-8000-000000000827',
  5
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000088014',
  'a0000000-0000-4000-8000-000000088015',
  'a0000000-0000-4000-8000-000000088041',
  'a0000000-0000-4000-8000-000000088051'
);

-- Move Join Slack cells to step slot 07.
update public.cells set id = 'a0000000-0000-4000-8000-000000100710' where id = 'a0000000-0000-4000-8000-000000100610';
update public.cells set id = 'a0000000-0000-4000-8000-000000100703' where id = 'a0000000-0000-4000-8000-000000100603';
update public.cells set id = 'a0000000-0000-4000-8000-000000100704' where id = 'a0000000-0000-4000-8000-000000100604';
update public.cells set id = 'a0000000-0000-4000-8000-000000100706' where id = 'a0000000-0000-4000-8000-000000100606';

-- Move Payroll setup cells to step slot 06.
update public.cells set id = 'a0000000-0000-4000-8000-000000100610' where id = 'a0000000-0000-4000-8000-000000100510';
update public.cells set id = 'a0000000-0000-4000-8000-000000100603' where id = 'a0000000-0000-4000-8000-000000100503';
update public.cells set id = 'a0000000-0000-4000-8000-000000100604' where id = 'a0000000-0000-4000-8000-000000100504';
update public.cells set id = 'a0000000-0000-4000-8000-000000100606' where id = 'a0000000-0000-4000-8000-000000100506';
update public.cells set id = 'a0000000-0000-4000-8000-000000100607' where id = 'a0000000-0000-4000-8000-000000100507';
update public.cells set id = 'a0000000-0000-4000-8000-000000100608' where id = 'a0000000-0000-4000-8000-000000100508';
update public.cells set id = 'a0000000-0000-4000-8000-000000100609' where id = 'a0000000-0000-4000-8000-000000100509';

-- New step 5 — attend I-9 meeting (Regular Tutor only).
insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000100510',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000818',
    'a0000000-0000-4000-8000-000000000827',
    ''
  ),
  (
    'a0000000-0000-4000-8000-000000100503',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000831',
    'a0000000-0000-4000-8000-000000000827',
    'Meets with CMU HR Department for I-9 meeting'
  )
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
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
    'a0000000-0000-4000-8000-000000088016',
    'a0000000-0000-4000-8000-000000100603',
    'a0000000-0000-4000-8000-000000100703'
  ),
  (
    'a0000000-0000-4000-8000-000000088041',
    'a0000000-0000-4000-8000-000000100603',
    'a0000000-0000-4000-8000-000000100604'
  ),
  (
    'a0000000-0000-4000-8000-000000088051',
    'a0000000-0000-4000-8000-000000100704',
    'a0000000-0000-4000-8000-000000100703'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
