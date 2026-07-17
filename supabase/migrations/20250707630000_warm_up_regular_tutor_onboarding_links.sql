-- Warm-Up — onboarding module links on every Regular Tutor cell (happy + alternate paths)

update public.cells c
set links = o.links || coalesce(
  (
    select jsonb_agg(elem order by ord)
    from jsonb_array_elements(c.links) with ordinality as t(elem, ord)
    where not (
      elem->>'type' = 'url'
      and elem->>'label' in (
        'PLUS Onboarding Module 5',
        'Notion Onboarding Module'
      )
    )
  ),
  '[]'::jsonb
)
from (
  select jsonb_build_array(
    jsonb_build_object(
      'type', 'url',
      'label', 'PLUS Onboarding Module 5',
      'url', 'https://app.tutors.plus/PLUS/Resource?resourceId=309'
    ),
    jsonb_build_object(
      'type', 'url',
      'label', 'Notion Onboarding Module',
      'url', 'https://plus-tutors.notion.site/Module-9-Goal-Setting-Practices-2a1b7cca498280278bb9e2c9f9e20b6b'
    )
  ) as links
) o
where c.id in (
  select c2.id
  from public.cells c2
  join public.layers l on l.id = c2.layer_id
  join public.paths p on p.id = c2.path_id
  where p.service_scenario_id = 'a0000000-0000-4000-8000-000000000203'
    and l.name = 'Regular Tutor'
);
