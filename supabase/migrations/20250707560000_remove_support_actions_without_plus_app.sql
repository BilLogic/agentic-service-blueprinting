-- Warm-Up and Goal Setting — remove Dev Team/Design team Support Actions on steps without PLUS App

delete from public.cells c
using public.layers l_support,
      public.layers l_tech,
      public.paths p,
      public.cells c_tech
where c.layer_id = l_support.id
  and l_support.name = 'Support Actions'
  and c.path_id = p.id
  and p.service_scenario_id in (
    'a0000000-0000-4000-8000-000000000203',
    'a0000000-0000-4000-8000-000000000204'
  )
  and (
    c.content = E'Dev Team\nDesign team'
    or c.content = 'Dev Team\nDesign Team'
  )
  and c_tech.path_id = c.path_id
  and c_tech.step_id = c.step_id
  and c_tech.layer_id = l_tech.id
  and l_tech.name = 'Front Stage Tech'
  and c_tech.content not like '%PLUS App%';
