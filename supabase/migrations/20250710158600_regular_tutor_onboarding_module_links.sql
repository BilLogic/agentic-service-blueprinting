-- Replace Regular Tutor onboarding module URL links across scenarios.
-- Removes obsolete PLUS app / Notion URL labels and sets the Notion module list.

with scenario_links(service_scenario_id, links) as (
  values
    (
      'a0000000-0000-4000-8000-000000000124'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 1', 'url', 'https://plus-tutors.notion.site/Module-1-Welcome-to-PLUS-26fb7cca4982809f95b8c754d0e70834'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 7', 'url', 'https://plus-tutors.notion.site/Module-7-Plus-App-Overview-26fb7cca498280c8b700e462fa340ddb')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000128'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 2', 'url', 'https://plus-tutors.notion.site/Module-2-Your-Role-at-PLUS-26fb7cca498280daac2fd7efc191708d'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 8', 'url', 'https://plus-tutors.notion.site/Module-8-Day-to-Day-Protocols-26fb7cca49828064a32cdde194e36bbd')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000207'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 2', 'url', 'https://plus-tutors.notion.site/Module-2-Your-Role-at-PLUS-26fb7cca498280daac2fd7efc191708d')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000201'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 3', 'url', 'https://plus-tutors.notion.site/Module-3-Tutoring-Session-Overview-26fb7cca498280dfa0daf291f2635b3f'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 4', 'url', 'https://plus-tutors.notion.site/Module-4-Tutoring-Session-Responsibilities-26fb7cca498280f3af02ffc07b5171e7'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 5', 'url', 'https://plus-tutors.notion.site/Module-5-Helping-Students-26fb7cca4982807fa5b7d2a0a92753dd'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 6', 'url', 'https://plus-tutors.notion.site/Module-6-Tutoring-Tools-26fb7cca498280e4aae2f73e8739388e'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 7', 'url', 'https://plus-tutors.notion.site/Module-7-Plus-App-Overview-26fb7cca498280c8b700e462fa340ddb')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000202'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 3', 'url', 'https://plus-tutors.notion.site/Module-3-Tutoring-Session-Overview-26fb7cca498280dfa0daf291f2635b3f'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 4', 'url', 'https://plus-tutors.notion.site/Module-4-Tutoring-Session-Responsibilities-26fb7cca498280f3af02ffc07b5171e7'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 5', 'url', 'https://plus-tutors.notion.site/Module-5-Helping-Students-26fb7cca4982807fa5b7d2a0a92753dd'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 6', 'url', 'https://plus-tutors.notion.site/Module-6-Tutoring-Tools-26fb7cca498280e4aae2f73e8739388e')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000206'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 3', 'url', 'https://plus-tutors.notion.site/Module-3-Tutoring-Session-Overview-26fb7cca498280dfa0daf291f2635b3f'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 4', 'url', 'https://plus-tutors.notion.site/Module-4-Tutoring-Session-Responsibilities-26fb7cca498280f3af02ffc07b5171e7'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 6', 'url', 'https://plus-tutors.notion.site/Module-6-Tutoring-Tools-26fb7cca498280e4aae2f73e8739388e')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000203'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 5', 'url', 'https://plus-tutors.notion.site/Module-5-Helping-Students-26fb7cca4982807fa5b7d2a0a92753dd'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 6', 'url', 'https://plus-tutors.notion.site/Module-6-Tutoring-Tools-26fb7cca498280e4aae2f73e8739388e')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000204'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 5', 'url', 'https://plus-tutors.notion.site/Module-5-Helping-Students-26fb7cca4982807fa5b7d2a0a92753dd'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 6', 'url', 'https://plus-tutors.notion.site/Module-6-Tutoring-Tools-26fb7cca498280e4aae2f73e8739388e'),
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 9', 'url', 'https://plus-tutors.notion.site/Module-9-Goal-Setting-Practices-2a1b7cca498280278bb9e2c9f9e20b6b')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000205'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 6', 'url', 'https://plus-tutors.notion.site/Module-6-Tutoring-Tools-26fb7cca498280e4aae2f73e8739388e')
      )
    ),
    (
      'a0000000-0000-4000-8000-000000000208'::uuid,
      jsonb_build_array(
        jsonb_build_object('type', 'url', 'label', 'Onboarding Module 8', 'url', 'https://plus-tutors.notion.site/Module-8-Day-to-Day-Protocols-26fb7cca49828064a32cdde194e36bbd')
      )
    )
),
target_cells as (
  select c.id, sl.links as module_links
  from public.cells c
  join public.paths p on p.id = c.path_id
  join public.layers l on l.id = c.layer_id
  join scenario_links sl on sl.service_scenario_id = p.service_scenario_id
  where l.name = 'Regular Tutor'
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
