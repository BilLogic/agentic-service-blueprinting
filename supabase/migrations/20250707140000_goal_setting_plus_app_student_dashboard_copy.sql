-- Goal Setting — PLUS App copy: Your Students / PLUS App dashboard → Student Dashboard

update public.cells c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description'
          and elem->>'label' = 'PLUS App'
          and (
            elem->>'description' like '%Your Students screen%'
            or elem->>'description' like '%PLUS App dashboard%'
          )
        then jsonb_set(
          elem,
          '{description}',
          to_jsonb(
            replace(
              replace(
                elem->>'description',
                'Your Students screen',
                'Student Dashboard screen'
              ),
              'PLUS App dashboard',
              'Student Dashboard screen'
            )
          )
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id in (
  select c2.id
  from public.cells c2
  join public.layers l on l.id = c2.layer_id
  join public.paths p on p.id = l.path_id
  where p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204'
)
and exists (
  select 1
  from jsonb_array_elements(c.links) as elem
  where elem->>'type' = 'tech_description'
    and elem->>'label' = 'PLUS App'
    and (
      elem->>'description' like '%Your Students screen%'
      or elem->>'description' like '%PLUS App dashboard%'
    )
);
