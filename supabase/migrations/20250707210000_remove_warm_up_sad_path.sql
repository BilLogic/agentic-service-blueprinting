-- Remove Warm-Up Sad Path (no longer used in the Warm-Up scenario).

delete from public.cell_triggers
where source_cell_id in (
    select id from public.cells
    where path_id = 'a0000000-0000-4000-8000-000000000360'
  )
  or target_cell_id in (
    select id from public.cells
    where path_id = 'a0000000-0000-4000-8000-000000000360'
  );

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000360';

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-000000000360';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000000360';

delete from public.paths
where id = 'a0000000-0000-4000-8000-000000000360';

delete from public.steps
where id in (
  'a0000000-0000-4000-8000-000000000319',
  'a0000000-0000-4000-8000-000000000320'
)
and service_scenario_id = 'a0000000-0000-4000-8000-000000000203';
