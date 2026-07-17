-- Reporting an Issue — move Resolve concern (step 2) to the last column.

update public.path_steps
set column_position = 10
where path_id = 'a0000000-0000-4000-8000-00000000080f'
  and step_id = 'a0000000-0000-4000-8000-000000000990';

update public.path_steps
set column_position = 2
where path_id = 'a0000000-0000-4000-8000-00000000080f'
  and step_id = 'a0000000-0000-4000-8000-000000000991';

update public.path_steps
set column_position = 3
where path_id = 'a0000000-0000-4000-8000-00000000080f'
  and step_id = 'a0000000-0000-4000-8000-000000000993';

update public.path_steps
set column_position = 4
where path_id = 'a0000000-0000-4000-8000-00000000080f'
  and step_id = 'a0000000-0000-4000-8000-000000000990';
