-- Add the same onboarding module URL links to Lead Tutor cells for
-- Reporting an Issue (Module 2) and Reporting Hours (Module 8).

with scenario_links(service_scenario_id, links) as (
  values
    (
      'a0000000-0000-4000-8000-000000000207'::uuid,
      jsonb_build_array(
        jsonb_build_object(
          'type', 'url',
          'label', 'Onboarding Module 2',
          'url', 'https://plus-tutors.notion.site/Module-2-Your-Role-at-PLUS-26fb7cca498280daac2fd7efc191708d'
        )
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000208'::uuid,
      jsonb_build_array(
        jsonb_build_object(
          'type', 'url',
          'label', 'Onboarding Module 8',
          'url', 'https://plus-tutors.notion.site/Module-8-Day-to-Day-Protocols-26fb7cca49828064a32cdde194e36bbd'
        )
      )
    )
),
target_cells as (
  select c.id, sl.links as module_links
  from public.cells c
  join public.paths p on p.id = c.path_id
  join public.layers l on l.id = c.layer_id
  join scenario_links sl on sl.service_scenario_id = p.service_scenario_id
  where l.name = 'Lead Tutor'
)
update public.cells c
set links = tc.module_links || coalesce(
  (
    select jsonb_agg(elem order by ord)
    from jsonb_array_elements(coalesce(c.links, '[]'::jsonb)) with ordinality as x(elem, ord)
    where elem->>'type' is distinct from 'url'
  ),
  '[]'::jsonb
)
from target_cells tc
where c.id = tc.id;
