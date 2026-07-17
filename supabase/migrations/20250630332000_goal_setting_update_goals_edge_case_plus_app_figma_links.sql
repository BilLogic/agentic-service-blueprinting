-- Update Goals Edge Case path — step-specific Figma links on PLUS App tech pills

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=6359-222250&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id in (
  'a0000000-0000-4000-8000-000000d00206',
  'a0000000-0000-4000-8000-000000d00306'
);

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5662-73487&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id in (
  'a0000000-0000-4000-8000-000000d00406',
  'a0000000-0000-4000-8000-000000d00506',
  'a0000000-0000-4000-8000-000000d00606'
);

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5662-73488&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id in (
  'a0000000-0000-4000-8000-000000d00706',
  'a0000000-0000-4000-8000-000000d00806',
  'a0000000-0000-4000-8000-000000d00906'
);

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5662-73490&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-000000d01006';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=6359-222615&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-000000d01206';
