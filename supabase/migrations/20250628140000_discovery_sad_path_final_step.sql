-- Discovery sad path must end on step 717, not the shared happy outcome step 716.

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-000000000701'
  and step_id = 'a0000000-0000-4000-8000-000000000716';

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-000000000701',
  'a0000000-0000-4000-8000-000000000717',
  6
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

update public.cells
set step_id = 'a0000000-0000-4000-8000-000000000717'
where path_id = 'a0000000-0000-4000-8000-000000000701'
  and step_id = 'a0000000-0000-4000-8000-000000000716';
