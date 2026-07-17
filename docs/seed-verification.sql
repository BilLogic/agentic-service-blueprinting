-- Verify Service Blueprint seed (run after npm run supabase:reset)

-- Lifecycle phases
select
  sl.name as lifecycle,
  p.order_position,
  p.name as phase,
  loop_p.name as loops_to
from public.service_lifecycles sl
join public.phases p on p.service_lifecycle_id = sl.id
left join public.phases loop_p on loop_p.id = p.loops_to_phase_id
where sl.id = 'a0000000-0000-4000-8000-000000000001'
order by p.order_position;

-- In-session scenarios
select
  p.name as phase,
  ss.order_position,
  ss.name as scenario
from public.phases p
join public.service_scenarios ss on ss.phase_id = p.id
where p.id = 'a0000000-0000-4000-8000-000000000104'
order by ss.order_position;

-- Warm-Up Happy Path blueprint
select
  ss.name as scenario,
  pa.name as path,
  pa.description,
  pa.path_type,
  (select count(*) from public.layers l where l.path_id = pa.id) as layers,
  (select count(*) from public.path_steps ps where ps.path_id = pa.id) as steps,
  (select count(*) from public.cells c where c.path_id = pa.id) as cells,
  (select count(*) from public.cell_triggers ct
   join public.cells c on c.id = ct.source_cell_id
   where c.path_id = pa.id) as triggers
from public.paths pa
join public.service_scenarios ss on ss.id = pa.service_scenario_id
where pa.id = 'a0000000-0000-4000-8000-000000000300';

select l.row_position, l.name as layer
from public.layers l
where l.path_id = 'a0000000-0000-4000-8000-000000000300'
order by l.row_position;

select ps.column_position, s.name as step
from public.path_steps ps
join public.steps s on s.id = ps.step_id
where ps.path_id = 'a0000000-0000-4000-8000-000000000300'
order by ps.column_position;
