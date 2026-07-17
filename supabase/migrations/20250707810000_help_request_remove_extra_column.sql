-- Help Request Happy Path — remove extra column 8 (visual-only escalate step).

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-00000000080d'
  and step_id in (
    'a0000000-0000-4000-8000-000000000986',
    'a0000000-0000-4000-8000-000000000987'
  );

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-00000000080d',
  'a0000000-0000-4000-8000-000000000987',
  7
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-00000000080d'
  and id = 'a0000000-0000-4000-8000-0000001b0810';

update public.cells
set step_id = 'a0000000-0000-4000-8000-000000000987'
where path_id = 'a0000000-0000-4000-8000-00000000080d'
  and step_id = 'a0000000-0000-4000-8000-000000000986';
