-- Reporting Hours — move Receive paycheck between Report hours and Approve hours.

update public.path_steps
set column_position = 10
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000994';

update public.path_steps
set column_position = 2
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000995';

update public.path_steps
set column_position = 3
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000994';
