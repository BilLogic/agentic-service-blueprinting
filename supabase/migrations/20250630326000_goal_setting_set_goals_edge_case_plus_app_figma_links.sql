-- Set Goals Edge Case path — step-specific Figma links on PLUS App tech pills

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5714-83721&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id in (
  'a0000000-0000-4000-8000-000000c00206',
  'a0000000-0000-4000-8000-000000c00306'
);

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5662-76049&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-000000c00406';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5662-76050&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-000000c00606';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5662-76051&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id in (
  'a0000000-0000-4000-8000-000000c00706',
  'a0000000-0000-4000-8000-000000c00806',
  'a0000000-0000-4000-8000-000000c00906'
);

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5662-76052&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-000000c01006';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=6359-220619&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-000000c01206';
